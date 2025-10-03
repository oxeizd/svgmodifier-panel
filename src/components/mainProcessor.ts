import { RegexCheck } from './utils/helpers';
import { DataExtractor } from './dataExtractor';
import { getMetricsData } from './dataProcessor';
import { formatValues } from './utils/ValueTransformer';
import { parseSvgDocument, applyChangesToElements } from './svgUpdater';
import { Change, ColorDataEntry, TooltipContent, ExpandedItem, Metric } from './types';

export function svgModifier(svg: string, changes: Change[], dataFrame: any[]) {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  const { doc, elementsMap } = parseSvgDocument(svg, parser);
  const svgElementsMap: Map<string, SVGElement> = elementsMap;

  const modify = (): { modifiedSvg: string; tooltipData: TooltipContent[] } => {
    const tooltipData: TooltipContent[] = [];
    const extractedValueMap = new DataExtractor(dataFrame).extractValues();

    proccesingRules(extractedValueMap, tooltipData);

    return {
      modifiedSvg: serializer.serializeToString(doc),
      tooltipData,
    };
  };

  const getElementsByIdOrRegex = (id: string): Array<[string, SVGElement]> => {
    const allEntries = Array.from(svgElementsMap.entries());

    return RegexCheck(id)
      ? allEntries.filter(([key]) => new RegExp(id).test(key))
      : allEntries.filter(([key]) => key === id);
  };

  const proccesingRules = (extractedValueMap: Map<string, any>, tooltipData: TooltipContent[]) => {
    const allRUles: ExpandedItem[] = [];
    for (const rule of changes) {
      const ruleItems: ExpandedItem[] = [];
      const attributes = rule.attributes;
      const configIds = Array.isArray(rule.id) ? rule.id : [rule.id ?? ''];

      for (const rawId of configIds) {
        const configId = (rawId ?? '').split(':');
        const id = configId[0] ?? undefined;
        const schema = configId[1] ?? undefined;
        const selector = configId.slice(2).join(':') ?? undefined;

        const elements = getElementsByIdOrRegex(id);

        for (const [svgId, svgElem] of elements) {
          ruleItems.push({
            id: svgId,
            schema,
            selector,
            svgElement: svgElem,
            attributes: schema ? applySchema(attributes, schema) : attributes,
            colorDataEntries: [],
          });
        }
      }

      if (attributes.metrics) {
        const metricConfig = getMetricsData({
          inputMetrics: attributes.metrics,
          metricData: extractedValueMap,
        });

        if (metricConfig) {
          metricsComparison(ruleItems, metricConfig, attributes.autoConfig || false);
          getMaxMetric(ruleItems);
        }
      }

      allRUles.push(...ruleItems);
    }

    for (const item of allRUles) {
      if (item.schema) {
        const originalMetrics = item.attributes.metrics;
        item.attributes = applySchema(item.attributes, item.schema);

        if (item.attributes.metrics && item.attributes.metrics !== originalMetrics) {
          const individualMetricConfig = getMetricsData({
            inputMetrics: item.attributes.metrics,
            metricData: extractedValueMap,
          });

          if (individualMetricConfig) {
            item.colorDataEntries = [];
            metricsComparison([item], individualMetricConfig, false);
            getMaxMetric([item]);
          }
        }
      }
    }

    applyChangesToElements(allRUles);
    createTooltipData(allRUles, tooltipData);
  };

  const applySchema = (attributes: any, schema: string) => {
    if (!schema) {
      return attributes;
    }

    const result = { ...attributes };

    const schemaActions: Record<string, () => void> = {
      basic: () => {
        delete result.label;
        delete result.labelColor;
        result.tooltip = result.tooltip || { show: true };
        if (result.metrics) {
          result.metrics = result.metrics.map((metric: Metric) => ({
            ...metric,
            filling: 'fill',
            baseColor: metric.baseColor || '#00ff00',
          }));
        }
      },
      stroke: () => {
        const propsToDelete = ['link', 'label', 'labelColor', 'tooltip'];
        propsToDelete.forEach((p) => delete result[p]);
        if (result.metrics) {
          result.metrics = result.metrics.map((metric: Metric) => ({
            ...metric,
            filling: 'stroke',
            baseColor: '',
          }));
        }
      },
      strokeBase: () => {
        const propsToDelete = ['link', 'label', 'labelColor', 'tooltip'];
        propsToDelete.forEach((p) => delete result[p]);
        if (result.metrics) {
          result.metrics = result.metrics.map((metric: Metric) => ({
            ...metric,
            filling: 'stroke',
          }));
        }
      },
      text: () => {
        delete result.link;
        delete result.tooltip;
        result.label = result.label || 'replace';
        result.labelColor = result.labelColor || 'metric';
        if (result.metrics) {
          result.metrics = result.metrics.map((metric: Metric) => ({
            ...metric,
            filling: 'none',
            baseColor: metric.baseColor || '',
          }));
        }
      },
      table: () => {
        delete result.link;
        delete result.tooltip;
        result.label = result.label || 'replace';
        result.labelColor = result.labelColor || 'metric';
        if (result.metrics) {
          result.metrics = result.metrics.map((metric: Metric) => ({
            ...metric,
            filling: 'fill, 20',
            baseColor: metric.baseColor || '#00ff00',
          }));
        }
      },
    };

    schemaActions[schema]?.();
    return result;
  };

  const metricsComparison = (
    ids: ExpandedItem[],
    processedData: { colorDataArray: ColorDataEntry[] },
    autoConfig: boolean
  ) => {
    const allEntries = processedData.colorDataArray;
    const idsLen = ids.length;

    for (let i = 0; i < idsLen; i++) {
      if (ids[i].selector && ids[i].selector.includes('@')) {
        const selectors: string[][] = ids[i].selector.split('|').map((s: string) => s.split('@'));

        for (const [type, idx] of selectors) {
          if (idx) {
            const indexes = idx.split(',').map(Number);

            if (type === 'r' || type === 'l') {
              const matchingEntries = allEntries.filter((entry) =>
                indexes.some((index) => entry.object === `${type}${index}`)
              );

              ids[i].colorDataEntries.push(...matchingEntries);
            }
          }
        }
      } else if (autoConfig === true) {
        if (i < allEntries.length) {
          ids[i].colorDataEntries.push(allEntries[i]);
        }
      } else if (autoConfig === false) {
        ids[i].colorDataEntries = [...allEntries];
      }
    }

    if (autoConfig && allEntries.length > idsLen) {
      let lastId = null;

      for (let i = ids.length - 1; i >= 0; i--) {
        if (!ids[i].selector) {
          lastId = i;
          break;
        }
      }

      if (lastId !== null) {
        for (let i = idsLen; i < allEntries.length; i++) {
          ids[lastId].colorDataEntries.push(allEntries[i]);
        }
      }
    }
  };

  const getMaxMetric = (ids: ExpandedItem[]) => {
    for (const item of ids) {
      if (!item.colorDataEntries || item.colorDataEntries.length === 0) {
        item.maxEntry = undefined;
        continue;
      }

      let best = item.colorDataEntries[0];
      for (let i = 1; i < item.colorDataEntries.length; i++) {
        const cur = item.colorDataEntries[i];
        const curLvl = cur.lvl ?? Number.NEGATIVE_INFINITY;
        const bestLvl = best.lvl ?? Number.NEGATIVE_INFINITY;
        if (curLvl > bestLvl || (curLvl === bestLvl && cur.metric > best.metric)) {
          best = cur;
        }
      }
      item.maxEntry = best;
    }
  };

  const createTooltipData = (ids: ExpandedItem[], tooltipData: TooltipContent[]) => {
    for (let i = 0; i < ids.length; i++) {
      const { id, attributes, colorDataEntries } = ids[i];
      if (!colorDataEntries || colorDataEntries.length === 0) {
        continue;
      }

      if (attributes.tooltip?.show) {
        for (let j = 0; j < colorDataEntries.length; j++) {
          const entry = colorDataEntries[j];
          tooltipData.push({
            id,
            label: (entry.label ?? '').replace(/_prfx\d+/g, ''),
            color: entry.color ?? '',
            metric: entry.unit ? formatValues(entry.metric, entry.unit) : String(entry.metric ?? ''),
            title: entry.title ?? '',
            textAbove: attributes.tooltip.textAbove,
            textBelow: attributes.tooltip.textBelow,
          });
        }
      }
    }
  };

  return {
    modify,
  };
}

export function modifySvg(
  svg: string,
  changes: Change[],
  dataFrame: any[]
): { modifiedSvg: string; tooltipData: TooltipContent[] } {
  const modifier = svgModifier(svg, changes, dataFrame);
  return modifier.modify();
}

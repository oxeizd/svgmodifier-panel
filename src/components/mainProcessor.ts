import { extractValues } from './dataExtractor';
import { getMetricsData } from './dataProcessor';
import { formatValues } from './utils/ValueTransformer';
import { parseSvgDocument, applyChangesToElements } from './svgUpdater';
import { RegexCheck, applySchema, getMappingMatch } from './utils/helpers';
import { Change, ColorDataEntry, TooltipContent, ExpandedItem, ValueMapping } from './types';

export function svgModifier(
  svg: string,
  changes: Change[],
  dataFrame: any[],
  svgAspectRatio: string,
  customRelativeTime: string,
  fieldRelativeTime: string
) {
  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  const { doc, elementsMap } = parseSvgDocument(svg, parser, svgAspectRatio);
  const svgElementsMap: Map<string, SVGElement> = elementsMap;

  const modify = (): { modifiedSvg: string; tooltipData: TooltipContent[] } => {
    const tooltipData: TooltipContent[] = [];
    const extractedValueMap = extractValues(dataFrame, customRelativeTime, fieldRelativeTime);

    proccesingRules(extractedValueMap, tooltipData);

    return {
      modifiedSvg: serializer.serializeToString(doc),
      tooltipData,
    };
  };

  const getElementsByIdOrRegex = (id: string): Array<[string, SVGElement]> => {
    const allEntries = Array.from(svgElementsMap.entries());
    const checkid = id && !id.startsWith('cell-') ? `cell-${id}` : id;

    return RegexCheck(checkid)
      ? allEntries.filter(([key]) => new RegExp(checkid).test(key))
      : allEntries.filter(([key]) => key === checkid);
  };

  const normalizeMetrics = (m: any) => {
    if (m == null) {
      return undefined;
    }
    return Array.isArray(m) ? m : [m];
  };

  const proccesingRules = (extractedValueMap: Map<string, any>, tooltipData: TooltipContent[]) => {
    const allRUles: ExpandedItem[] = [];
    for (const rule of changes) {
      const attributes = rule.attributes;
      if (!attributes) {
        continue;
      }

      const ruleItems: ExpandedItem[] = [];
      const configIds = Array.isArray(rule.id) ? rule.id : [rule.id ?? ''];

      for (const rawId of configIds) {
        const configId = (rawId ?? '').split(':');
        const id = configId[0] ?? undefined;
        const schema = configId[1] ?? undefined;
        const selector = configId.slice(2).join(':') ?? undefined;

        const elements = getElementsByIdOrRegex(id);

        for (const [svgId, svgElem] of elements) {
          const attrsCopy = { ...attributes };
          attrsCopy.metrics = normalizeMetrics(attrsCopy.metrics);

          ruleItems.push({
            id: svgId,
            schema,
            selector,
            svgElement: svgElem,
            attributes: schema ? applySchema(attrsCopy, schema) : attrsCopy,
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

        item.attributes.metrics = normalizeMetrics(item.attributes.metrics);

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
    for (const { id, attributes, colorDataEntries } of ids) {
      if (!colorDataEntries?.length || !attributes.tooltip?.show) {
        continue;
      }

      for (const entry of colorDataEntries) {
        const metricValue = formatMetricValue(entry, attributes.valueMapping);

        tooltipData.push({
          id,
          label: (entry.label ?? '').replace(/_prfx\d+/g, ''),
          color: entry.color ?? '',
          metric: metricValue,
          title: entry.title ?? '',
          textAbove: attributes.tooltip.textAbove,
          textBelow: attributes.tooltip.textBelow,
        });
      }
    }
  };

  const formatMetricValue = (entry: ColorDataEntry, valueMapping?: ValueMapping[]): string => {
    if (entry.metric == null) {
      return '';
    }

    if (valueMapping) {
      const mappedValue = getMappingMatch(valueMapping, entry.metric);
      if (mappedValue !== undefined) {
        return mappedValue;
      }
    } else if (entry.unit) {
      return formatValues(entry.metric, entry.unit);
    }

    return String(entry.metric);
  };

  return modify();
}

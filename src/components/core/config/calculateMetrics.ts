import { getMetricsData, QueriesArray } from '../handler/dataHandler';
import { DataFrameMap } from '../extractor/dataExtractor';
import { getElementColor, getLabel, getLabelColor } from '../svg/helpers';
import { addLinkToElement, updateSvgElementRecursive } from '../svg/updater';
import { ConfigRules, DataMap, TableMetricData, TooltipContent, MetricData } from '../../types';

export async function calculateMetrics(configMap: Map<string, DataMap>, dataFrame: DataFrameMap) {
  const tooltip: TooltipContent[] = [];
  const operations: Array<() => void> = [];

  for (const [id, map] of configMap) {
    if (!map?.additional || !Array.isArray(map.additional)) {
      continue;
    }

    let bestMetric = Number.NEGATIVE_INFINITY;
    let bestSingleLvl = -100;
    let bestTableLvl = -100;
    let bestAttributes: ConfigRules['attributes'] | undefined;
    let bestEntry: MetricData | TableMetricData | undefined;

    for (const item of map.additional) {
      const { attributes, selector, elemIndex, elemsLength } = item;

      if (!attributes?.metrics || attributes.metrics.length === 0) {
        if (bestAttributes === undefined) {
          bestAttributes = attributes;
        }
        continue;
      }

      const queriesArray = getMetricsData(attributes.metrics, dataFrame, attributes.valueMapping);

      if (!queriesArray || !queriesArray.fields || !queriesArray.tables) {
        continue;
      }

      queriesFilter(queriesArray, selector, elemIndex, elemsLength, attributes.autoConfig);

      const singleEntry = singleMetricsProccess(id, queriesArray.fields!, attributes, tooltip);
      const tableEntry = tableMetricsProccess(id, queriesArray.tables, attributes, tooltip);

      const singleLvl = singleEntry.bestSingleEntry?.lvl ?? -Infinity;
      const tableLvl = tableEntry.bestTableEntry?.lvl ?? -Infinity;
      const currentMetric = singleEntry.bestSingleEntry?.metricValue ?? Number.NEGATIVE_INFINITY;

      if (singleLvl > bestSingleLvl || (singleLvl === bestSingleLvl && currentMetric > bestMetric)) {
        bestSingleLvl = singleLvl;
        bestMetric = currentMetric;
        bestEntry = singleEntry.bestSingleEntry;
        bestAttributes = singleEntry.bestAttributes;
      }

      if (tableLvl > bestTableLvl) {
        bestTableLvl = tableLvl;
        if (bestTableLvl > bestSingleLvl) {
          bestEntry = tableEntry.bestTableEntry;
          bestAttributes = tableEntry.bestAttributes;
        }
      }
    }

    const svgElement = map.SVGElem;
    if (!svgElement) {
      continue;
    }
    // console.log('apply', svgElement, bestAttributes, bestEntry)
    const hasLink = bestAttributes ? 'link' in bestAttributes : false;
    const hasLabel = bestAttributes ? 'label' in bestAttributes : false;
    const hasLabelColor = bestAttributes ? 'labelColor' in bestAttributes : false;

    const label = getLabel(bestEntry, bestAttributes?.label);
    const labelColor = getLabelColor(bestAttributes?.labelColor, bestEntry?.color);
    const elementColors = getElementColor(bestEntry?.color, bestEntry?.filling);

    operations.push(() => {
      hasLink && addLinkToElement(svgElement, bestAttributes?.link?.toString());
      updateSvgElementRecursive(svgElement, [hasLabel, label], [hasLabelColor, labelColor], elementColors);
    });
  }

  return { tooltip, operations };
}

function singleMetricsProccess(
  id: string,
  singleData: MetricData[],
  attributes: ConfigRules['attributes'],
  tooltip: TooltipContent[]
) {
  let bestLvl = Number.NEGATIVE_INFINITY;
  let bestMetric = Number.NEGATIVE_INFINITY;
  let bestSingleEntry: MetricData | undefined;
  let bestAttributes: ConfigRules['attributes'] | undefined = undefined;

  for (const entry of singleData) {
    const currentLvl = entry.lvl ?? Number.NEGATIVE_INFINITY;
    const currentMetric = entry.metricValue ?? Number.NEGATIVE_INFINITY;

    if (currentLvl > bestLvl || (currentLvl === bestLvl && currentMetric > bestMetric)) {
      bestLvl = currentLvl;
      bestMetric = currentMetric;
      bestSingleEntry = entry;
      bestAttributes = attributes;
    }

    if (attributes?.tooltip && attributes.tooltip.show) {
      const { textAbove, textBelow } = attributes.tooltip;

      const foundTooltip = tooltip.find((item) => item.id === id);
      const queryData = {
        label: entry.label,
        metric: entry.displayValue || entry.metricValue.toString(),
        color: entry.color,
        title: entry.title,
      };

      if (!foundTooltip) {
        tooltip.push({
          id: id,
          queryData: [queryData],
          textAbove: textAbove,
          textBelow: textBelow,
        });
      } else {
        foundTooltip.queryData?.push(queryData);
      }
    }
  }

  return { bestAttributes, bestSingleEntry };
}

function tableMetricsProccess(
  id: string,
  tableData: TableMetricData[],
  attributes: ConfigRules['attributes'],
  tooltip: TooltipContent[]
) {
  let bestLvl = Number.NEGATIVE_INFINITY;
  let bestAttributes: ConfigRules['attributes'] | undefined = undefined;
  let bestTableEntry: TableMetricData | undefined;

  for (const entry of tableData) {
    const currentLvl = entry.lvl ?? Number.NEGATIVE_INFINITY;

    if (currentLvl > bestLvl || currentLvl === bestLvl) {
      bestLvl = currentLvl;
      bestTableEntry = entry;
      if (bestAttributes === undefined) {
        bestAttributes = attributes;
      }
    }

    if (attributes?.tooltip && attributes.tooltip.show) {
      const { textAbove, textBelow } = attributes.tooltip;

      const foundTooltip = tooltip.find((item) => item.id === id);
      const tableData = {
        headers: entry.headers,
        columnsData: entry.columnsData,
        title: entry.title,
      };

      if (!foundTooltip) {
        tooltip.push({
          id: id,
          queryTableData: [tableData],
          textAbove: textAbove,
          textBelow: textBelow,
        });
      } else {
        foundTooltip.queryTableData?.push(tableData);
      }
    }
  }

  return { bestAttributes, bestTableEntry };
}

function queriesFilter(
  queriesArray: QueriesArray,
  selector: number[] | undefined,
  index: number,
  elemsLength: number,
  autoConfig?: boolean
) {
  const fieldsLength = queriesArray.fields?.length || 0;
  const tablesLenght = queriesArray.tables?.length || 0;
  const metricsLength = fieldsLength + tablesLenght;

  if (metricsLength === 0) {
    return;
  }

  if (selector && selector.length > 0) {
    const selectorSet = new Set(selector);

    if (queriesArray.fields) {
      queriesArray.fields = queriesArray.fields.filter((item) => selectorSet.has(item.counter));
    }

    if (queriesArray.tables) {
      queriesArray.tables = queriesArray.tables.filter((item) => selectorSet.has(item.counter));
    }

    return;
  }

  if (autoConfig === true) {
    const keepCounters = new Set<number>();

    if (metricsLength === elemsLength) {
      keepCounters.add(index);
    } else if (metricsLength < elemsLength) {
      if (index < metricsLength) {
        keepCounters.add(index);
      }
    } else {
      const lastIndex = elemsLength - 1;
      if (index < lastIndex) {
        keepCounters.add(index + 1);
      } else {
        for (let c = elemsLength; c <= metricsLength; c++) {
          keepCounters.add(c);
        }
      }
    }

    if (queriesArray.fields) {
      queriesArray.fields = queriesArray.fields.filter((item) => keepCounters.has(item.counter));
    }
    if (queriesArray.tables) {
      queriesArray.tables = queriesArray.tables.filter((item) => keepCounters.has(item.counter));
    }

    return;
  }
}

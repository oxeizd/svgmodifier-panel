import { DataFrameMap } from '../extractor/dataExtractor';
import { getMetricsData, QueriesArray } from '../handler/dataHandler';
import { getElementColor, getLabel, getLabelColor } from '../svg/helpers';
import { addLinkToElement, updateSvgElementRecursive } from '../svg/updater';
import { ConfigRules, DataMap, TableMetricData, TooltipContent, MetricData } from '../../types';

export async function calculateMetrics(
  configMap: Map<string, DataMap>,
  dataFrame: DataFrameMap,
  firingThreshold?: number
) {
  const tooltip: TooltipContent[] = [];
  const operations: Array<() => void> = [];
  const dataSourceNames: string[] = [];

  for (const [id, map] of configMap) {
    if (!map.SVGElem || !map.additional || !Array.isArray(map.additional)) {
      continue;
    }

    let bestGloablLvl = Number.NEGATIVE_INFINITY;
    let bestGlobalMetric = Number.NEGATIVE_INFINITY;
    let bestGlobalAttributes: ConfigRules['attributes'] | undefined;
    let bestGlobalEntry: MetricData | TableMetricData | undefined;

    for (const item of map.additional) {
      const { attributes, selector, elemIndex, elemsLength } = item;

      if (!attributes?.metrics || attributes.metrics.length === 0) {
        if (bestGlobalAttributes === undefined) {
          bestGlobalAttributes = attributes;
        }
        continue;
      }

      const queriesArray = getMetricsData(attributes.metrics, dataFrame, attributes.valueMapping);

      if (!queriesArray || !queriesArray.fields || !queriesArray.tables) {
        continue;
      }

      queriesFilter(queriesArray, selector, elemIndex, elemsLength, attributes.autoConfig);

      const { dsNames, bestLvl, bestMetric, bestAttributes, bestEntry } = metricProcessor(
        id,
        queriesArray,
        attributes,
        tooltip,
        firingThreshold
      );

      for (const name of dsNames) {
        if (!dataSourceNames.includes(name)) {
          dataSourceNames.push(name);
        }
      }

      if (bestLvl > bestGloablLvl || (bestLvl === bestGloablLvl && bestMetric > bestGlobalMetric)) {
        bestGloablLvl = bestLvl;
        bestGlobalMetric = bestMetric;
        bestGlobalEntry = bestEntry;
        bestGlobalAttributes = bestAttributes;
      }
    }

    operations.push(svgOperation(map.SVGElem!, bestGlobalAttributes!, bestGlobalEntry!));
  }

  return { dataSourceNames, tooltip, operations };
}

function metricProcessor(
  id: string,
  queries: QueriesArray,
  attributes: ConfigRules['attributes'],
  tooltip: TooltipContent[],
  firingValue?: number
) {
  let bestLvl = Number.NEGATIVE_INFINITY;
  let bestMetric = Number.NEGATIVE_INFINITY;
  let bestEntry: MetricData | TableMetricData | undefined;
  let bestAttributes: ConfigRules['attributes'] | undefined = undefined;
  let dsNames: string[] = [];

  if (queries.fields && queries.fields.length > 0) {
    for (const field of queries.fields) {
      const currentLvl = field.lvl ?? Number.NEGATIVE_INFINITY;
      const currentMetric = field.metricValue ?? Number.NEGATIVE_INFINITY;

      if (firingValue && field.dsName) {
        if (currentMetric >= firingValue) {
          dsNames.push(field.dsName);
        }
      }

      if (currentLvl > bestLvl || (currentLvl === bestLvl && currentMetric > bestMetric)) {
        bestLvl = currentLvl;
        bestMetric = currentMetric;
        bestEntry = field;
        bestAttributes = attributes;
      }

      if (attributes?.tooltip && attributes.tooltip.show) {
        const foundTooltip = tooltip.find((item) => item.id === id);

        const queryData = {
          label: field.label,
          metric: field.displayValue || field.metricValue.toString(),
          color: field.color,
          title: field.title,
        };

        if (!foundTooltip) {
          tooltip.push({
            id: id,
            queryData: [queryData],
            textAbove: attributes.tooltip.textAbove,
            textBelow: attributes.tooltip.textBelow,
          });
        } else {
          foundTooltip.queryData?.push(queryData);
        }
      }
    }
  }

  if (queries.tables && queries.tables.length > 0) {
    for (const table of queries.tables) {
      const currentLvl = table.lvl ?? Number.NEGATIVE_INFINITY;

      if (currentLvl > bestLvl || (currentLvl === bestLvl && !bestMetric)) {
        bestLvl = currentLvl;
        bestEntry = table;
        if (bestAttributes === undefined) {
          bestAttributes = attributes;
        }
      }

      if (attributes?.tooltip && attributes.tooltip.show) {
        const { textAbove, textBelow } = attributes.tooltip;

        const foundTooltip = tooltip.find((item) => item.id === id);
        const tableData = {
          headers: table.headers,
          columnsData: table.columnsData,
          title: table.title,
        };

        if (!foundTooltip) {
          tooltip.push({
            id: id,
            queryTableData: [tableData],
            textAbove: textAbove,
            textBelow: textBelow,
          });
        } else {
          if (!foundTooltip.queryTableData) {
            foundTooltip.queryTableData = [];
          }
          foundTooltip.queryTableData.push(tableData);
        }
      }
    }
  }

  return { dsNames, bestLvl, bestMetric, bestAttributes, bestEntry };
}

function queriesFilter(
  queries: QueriesArray,
  selector: number[] | undefined,
  index: number,
  elemsLength: number,
  autoConfig?: boolean
) {
  const fieldsLength = queries.fields?.length || 0;
  const tablesLenght = queries.tables?.length || 0;
  const metricsLength = fieldsLength + tablesLenght;

  if (metricsLength === 0) {
    return;
  }

  if (selector && selector.length > 0) {
    const selectorSet = new Set(selector);

    if (queries.fields) {
      queries.fields = queries.fields.filter((item) => selectorSet.has(item.counter));
    }

    if (queries.tables) {
      queries.tables = queries.tables.filter((item) => selectorSet.has(item.counter));
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

    if (queries.fields) {
      queries.fields = queries.fields.filter((item) => keepCounters.has(item.counter));
    }
    if (queries.tables) {
      queries.tables = queries.tables.filter((item) => keepCounters.has(item.counter));
    }

    return;
  }
}

function svgOperation(
  svgElement: SVGElement,
  attributes: ConfigRules['attributes'],
  data: MetricData | TableMetricData
) {
  return () => {
    if (!data) {
      return;
    }

    const hasLink = attributes ? 'link' in attributes : false;
    const hasLabel = attributes ? 'label' in attributes : false;
    const hasLabelColor = attributes ? 'labelColor' in attributes : false;

    const label = getLabel(data, attributes?.label);
    const labelColor = getLabelColor(attributes?.labelColor, data?.color);
    const elementColors = getElementColor(data?.color, data?.filling);

    hasLink && addLinkToElement(svgElement, attributes?.link?.toString());
    updateSvgElementRecursive(svgElement, [hasLabel, label], [hasLabelColor, labelColor], elementColors);
  };
}

import { getMetricsData } from '../handler/dataHandler';
import { DataFrameMap } from '../extractor/dataExtractor';
import { ConfigRules, DataMap, TableMetricData, TooltipContent, MetricData } from '../../types';

export async function calculateMetrics(
  configMap: Map<string, DataMap>,
  dataFrame: DataFrameMap,
  firingSetting?: number
) {
  const tooltip: TooltipContent[] = [];

  configMap.forEach((map, id) => {
    let bestEntry: MetricData | undefined;
    let bestLvl = Number.NEGATIVE_INFINITY;
    let bestMetric = Number.NEGATIVE_INFINITY;
    let bestAttributes: ConfigRules['attributes'] | undefined = undefined;
    let colorTableEntry: string | undefined = undefined;

    const getMaxMetricAndTooltips = (
      metricData: MetricData[],
      tableData: TableMetricData[],
      attributes: typeof bestAttributes
    ) => {
      if (!metricData || !metricData.length) {
        bestAttributes = attributes;
      }

      if (metricData) {
        for (const entry of metricData) {
          const currentLvl = entry.lvl ?? Number.NEGATIVE_INFINITY;
          const currentMetric = entry.metricValue ?? Number.NEGATIVE_INFINITY;

          if (currentLvl > bestLvl || (currentLvl === bestLvl && currentMetric > bestMetric)) {
            bestLvl = currentLvl;
            bestMetric = currentMetric;
            bestEntry = entry;
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
      }

      if (!tableData || !tableData.length) {
        return;
      }

      for (const entry of tableData) {
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
        colorTableEntry = entry.maxColor;
      }
    };

    const { additional } = map;

    if (additional && Array.isArray(additional)) {
      for (const item of additional) {
        const { attributes, selector, elemIndex, elemsLength } = item;

        if (!attributes.metrics) {
          bestAttributes = attributes;
          continue;
        }

        const metricsResult = getMetricsData(attributes.metrics, dataFrame, attributes.valueMapping);
        const metricsData = filterQueries(
          metricsResult?.metricsData!,
          selector,
          elemIndex,
          elemsLength,
          attributes.autoConfig
        );
        getMaxMetricAndTooltips(metricsData, metricsResult?.tableMetricData!, attributes);
      }
    }

    map.maxTableEntry = colorTableEntry;
    map.maxEntry = bestEntry;
    map.attributes = bestAttributes;
  });

  return { tooltip };
}

function filterQueries(
  metricsData: MetricData[],
  selector: string | undefined,
  index: number,
  elemsLength: number,
  autoConfig?: boolean
): MetricData[] {
  if (!metricsData || !metricsData.length) {
    return metricsData;
  }

  const metricsLength = metricsData.length;
  const vizData: MetricData[] = [];

  if (selector && typeof selector === 'string') {
    const expand = (s: string) => {
      const cleanStr = s.startsWith('@') ? s.substring(1) : s;
      const result = [];

      for (const p of cleanStr.split(',')) {
        const trimmed = p.trim();
        if (!trimmed) {
          continue;
        }

        const [a, b] = trimmed.split('-').map(Number);

        if (b === undefined) {
          if (!isNaN(a)) {
            result.push(a);
          }
        } else if (!isNaN(a) && !isNaN(b)) {
          const step = a <= b ? 1 : -1;
          for (let i = a; step > 0 ? i <= b : i >= b; i += step) {
            result.push(i);
          }
        }
      }

      return result;
    };

    const expanded = expand(selector);

    if (expanded.length > 0) {
      const matchingEntries = metricsData.filter((entry) => expanded.some((i) => entry.counter === i));
      vizData.push(...matchingEntries);

      return vizData;
    }
  }

  if (autoConfig === true) {
    if (metricsLength === elemsLength) {
      vizData.push(metricsData[index]);
    } else if (metricsLength < elemsLength) {
      if (index < metricsLength) {
        vizData.push(metricsData[index]);
      }
    } else {
      const lastIndex = elemsLength - 1;
      if (index < lastIndex) {
        vizData.push(metricsData[index]);
      } else {
        vizData.push(...metricsData.slice(lastIndex));
      }
    }
    return vizData;
  }

  vizData.push(...metricsData);
  return vizData;
}

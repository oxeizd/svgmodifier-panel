import { compareValues, matchPattern, roundToFixed } from './utils/helpers';
import { Legends, Metric, RefIds, Threshold, ColorDataEntry } from './types';

type CalculationMethod = 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';
type MetricDataMap = Map<string, { values: Map<string, { values: string[]; timestamps: number[] }> }>;

interface ElementColorMappingParams {
  inputMetrics: Metric | Metric[];
  metricData: MetricDataMap;
}

export function getMetricsData(params: ElementColorMappingParams): { colorDataArray: ColorDataEntry[] } {
  const { inputMetrics, metricData: extractedValueMap } = params;
  const metrics = Array.isArray(inputMetrics) ? inputMetrics : [inputMetrics];
  const colorDataArray: ColorDataEntry[] = [];

  for (const metric of metrics) {
    let refCounter = 1;
    let legendCounter = 1;

    metric.refIds?.forEach((ref) => {
      const metricData = extractedValueMap.get(ref.refid);
      if (!metricData) {
        return;
      }
      const items: Array<{ displayName: string; value: number }> = [];

      for (const [innerKey, values] of metricData.values) {
        const value = calculateValue(values.values.map(Number), ref.calculation || 'last');
        items.push({ displayName: innerKey, value });
      }

      const filteredItems = applyFilterToData(items, ref.filter);
      createColorEntriesFromData(filteredItems, metric, ref, false, `r${refCounter++}`);
    });

    metric.legends?.forEach((legend) => {
      const filteredItems: Array<{ displayName: string; value: number; globalKey: string }> = [];

      for (const [globalKey, metricData] of extractedValueMap) {
        for (const [innerKey, values] of metricData.values) {
          if (matchPattern(legend.legend, innerKey)) {
            filteredItems.push({
              displayName: innerKey,
              value: calculateValue(values.values.map(Number), legend.calculation || 'last'),
              globalKey,
            });
          }
        }
      }

      if (filteredItems.length > 0) {
        createColorEntriesFromData(
          applyFilterToData(filteredItems, legend.filter),
          metric,
          legend,
          true,
          `l${legendCounter++}`
        );
      }
    });
  }

  function createColorEntriesFromData(
    data: Array<{ displayName: string; value: number; globalKey?: string }>,
    metric: Metric,
    config: RefIds | Legends,
    isLegend: boolean,
    key: string
  ) {
    const { baseColor, displayText, decimal, filling } = metric;

    const sumMode = 'sum' in config && config.sum;
    const thresholdsToUse = getThresholds(config, metric);

    const addEntry = (value: number, label: string) => {
      const colorResult = getMetricColor(value, extractedValueMap, thresholdsToUse, baseColor);

      const entry: ColorDataEntry = {
        object: key,
        label: label,
        color: colorResult.color,
        lvl: colorResult.lvl,
        metric: roundToFixed(value, decimal),
        filling: filling || '',
        unit: config.unit,
        title: config.title,
      };

      colorDataArray.push(entry);
    };

    if (sumMode) {
      if (data.length === 0) {
        return;
      }

      const sumValue = data.reduce((acc, item) => acc + item.value, 0);
      addEntry(sumValue, config.label || displayText || config.sum!);
    } else {
      data.forEach((item) => {
        addEntry(item.value, config.label || displayText || item.displayName);
      });
    }
  }
  return { colorDataArray };
}

function getThresholds(config: RefIds | Legends, metric: Metric): Threshold[] | undefined {
  return 'thresholds' in config && config.thresholds?.length ? config.thresholds : metric.thresholds;
}

function applyFilterToData(
  data: Array<{ displayName: string; value: number }>,
  filter?: string
): Array<{ displayName: string; value: number }> {
  if (!filter) {
    return data;
  }

  const filteredData: Array<{ displayName: string; value: number }> = [];
  const currentDate = new Date();
  const filterParts = filter.split(',');

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    let shouldInclude = false;

    for (let j = 0; j < filterParts.length; j++) {
      const trimmed = filterParts[j].trim();
      const isExclusion = trimmed.startsWith('-');
      const filterValue = isExclusion ? trimmed.slice(1) : trimmed;

      if (filterValue.startsWith('$date')) {
        const days = parseInt(filterValue.replace('$date', ''), 10) || 0;
        const targetDate = new Date(currentDate);
        targetDate.setDate(currentDate.getDate() - days);
        if (item.displayName === targetDate.toISOString().split('T')[0]) {
          shouldInclude = !isExclusion;
          break;
        }
      } else if (matchPattern(filterValue, item.displayName)) {
        shouldInclude = !isExclusion;
        break;
      }
    }

    if (shouldInclude) {
      filteredData.push(item);
    }
  }

  return filteredData;
}

function calculateValue(values: number[], method: CalculationMethod): number {
  if (values.length === 0) {
    return 0;
  }

  let result: number;
  switch (method) {
    case 'last':
      result = values[values.length - 1];
      break;
    case 'total':
      result = values.reduce((a, b) => a + b, 0);
      break;
    case 'max':
      result = Math.max(...values);
      break;
    case 'min':
      result = Math.min(...values);
      break;
    case 'count':
      result = values.length;
      break;
    case 'delta':
      result = values[values.length - 1] - values[0];
      break;
    default:
      result = values[values.length - 1];
  }

  return result;
}

function getMetricColor(value: number, ValueMap: MetricDataMap, thresholds?: Threshold[], baseColor?: string) {
  let color = baseColor || '';
  let lvl = 1;

  thresholds?.forEach((t, index) => {
    if (t.condition && !evaluateThresholdCondition(t.condition, ValueMap)) {
      return;
    }

    const operator = t.operator || '>=';
    const compareResult = compareValues(value, t.value, operator);
    if (compareResult) {
      color = t.color;
      lvl = t.lvl || index + 1;
    }
  });

  if (color === baseColor) {
    lvl = 0;
  }

  return { color, lvl };
}

function evaluateThresholdCondition(condition: string, ValueMap: MetricDataMap): boolean {
  let result = false;
  try {
    const now = new Date();
    const timezone = parseInt(condition.match(/timezone\s*=\s*(-?\d+)/)?.[1] || '3', 10);
    const hour = (now.getUTCHours() + timezone + 24) % 24;
    const sanitizedCondition = condition.replace(/timezone\s*=\s*(-?\d+),?/, '').trim();

    const variableRegex =
      /\$([А-Яа-яЁёA-Za-z0-9_]+)(?:\.([А-Яа-яЁёA-Za-z0-9_ -]+))?(?::(last|total|max|min|count|delta))?/g;

    const metricsCondition = sanitizedCondition.replace(
      variableRegex,
      (_match: string, refId: string, subKey: string, calculationMethod: CalculationMethod = 'last') => {
        if (refId !== undefined) {
          refId = refId.trim();
          const metricData = ValueMap.get(refId);
          if (metricData) {
            let value = 0;
            if (subKey !== undefined) {
              subKey = subKey.trim();
              const subKeyValues = metricData.values.get(subKey);
              if (subKeyValues) {
                const numericValues: number[] = subKeyValues.values.map(Number);
                value = calculateValue(numericValues, calculationMethod);
              }
            } else {
              // Если subKey не указан, берем первое значение из метрики
              const firstValue = Array.from(metricData.values.values())[0];
              if (firstValue) {
                const numericValues: number[] = firstValue.values.map(Number);
                value = calculateValue(numericValues, calculationMethod);
              }
            }
            return value.toFixed(2);
          }
        }
        return '0';
      }
    );
    result = new Function('hour', 'minute', 'day', `return ${metricsCondition}`)(
      hour,
      now.getUTCMinutes(),
      now.getUTCDay()
    );
  } catch (error) {
    result = false;
  }

  return result;
}

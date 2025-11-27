import { compareValues, matchPattern, roundToFixed } from './utils/helpers';
import { Metric, BaseRef, Threshold, ColorDataEntry } from './types';

type MetricsDataMap = Map<string, { values: Map<string, { values: string[]; timestamps: number[] }> }>;
type QueriesArray = Array<{ displayName: string; value: number; globalKey?: string }>;
type CalculationMethod = 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';

export function getMetricsData(metrics: Metric | Metric[], extractedValueMap: MetricsDataMap): ColorDataEntry[] {
  const metricsArray = Array.isArray(metrics) ? metrics : [metrics];
  const colorData: ColorDataEntry[] = [];

  let refCounter = 1;
  let legendCounter = 1;

  for (const metric of metricsArray) {
    const processedMetric = processLegacyMetric(metric);

    processedMetric.queries?.forEach((query) => {
      if (query.refid) {
        processRefid(query, metric, extractedValueMap, colorData, refCounter);
        refCounter++;
      } else if (query.legend) {
        processLegend(query, metric, extractedValueMap, colorData, legendCounter);
        legendCounter++;
      }
    });
  }

  return colorData;
}

function processLegacyMetric(metric: any): Metric {
  // Если нет legacy полей, возвращаем как есть
  if (!metric.refIds && !metric.legends) {
    return metric;
  }

  // Создаем копию метрики
  const newMetric = { ...metric };

  // Создаем массив queries из legacy структур
  const queries: any[] = [];

  // Преобразуем refIds
  if (metric.refIds && Array.isArray(metric.refIds)) {
    metric.refIds.forEach((item: any) => {
      if (item && item.refid) {
        queries.push({ ...item });
      }
    });
  }

  // Преобразуем legends
  if (metric.legends && Array.isArray(metric.legends)) {
    metric.legends.forEach((item: any) => {
      if (item && item.legend) {
        queries.push({ ...item });
      }
    });
  }

  // Заменяем старые поля на queries
  if (queries.length > 0) {
    newMetric.queries = queries;
  }

  // Удаляем старые поля
  delete (newMetric as any).refIds;
  delete (newMetric as any).legends;

  return newMetric;
}

function processRefid(
  query: BaseRef & { refid: string },
  metric: Metric,
  extractedValueMap: MetricsDataMap,
  colorData: ColorDataEntry[],
  counter: number
): void {
  const extractedData = extractedValueMap.get(query.refid);

  if (!extractedData) {
    return;
  }

  const queries: QueriesArray = [];
  for (const [innerKey, values] of extractedData.values) {
    const value = calculateValue(values.values.map(Number), query.calculation || 'last');
    queries.push({ displayName: innerKey, value });
  }

  const finalQueries = filterData(queries, query.filter);

  if (finalQueries) {
    processFinalQueries(finalQueries, query, metric, extractedValueMap, colorData, `r${counter}`, counter);
  }
}

function processLegend(
  query: BaseRef & { legend: string },
  metric: Metric,
  extractedValueMap: MetricsDataMap,
  colorData: ColorDataEntry[],
  counter: number
): void {
  const queries: QueriesArray = [];

  for (const [globalKey, metricData] of extractedValueMap) {
    for (const [innerKey, values] of metricData.values) {
      if (matchPattern(query.legend, innerKey)) {
        queries.push({
          displayName: innerKey,
          value: calculateValue(values.values.map(Number), query.calculation || 'last'),
          globalKey,
        });
      }
    }
  }
  const finalQueries = filterData(queries, query.filter);

  if (finalQueries) {
    processFinalQueries(finalQueries, query, metric, extractedValueMap, colorData, `r${counter}`, counter);
  }
}

function processFinalQueries(
  finalQueries: QueriesArray,
  query: BaseRef,
  metric: Metric,
  extractedValueMap: MetricsDataMap,
  colorData: ColorDataEntry[],
  objectId: string,
  counter: number
): void {
  const sumMode = 'sum' in query && query.sum;
  const thresholdsToUse = getThresholds(query, metric);
  const title = getTitle(query, counter);
  const { filling, decimal } = metric;
  const { unit } = query;

  if (query.sum && sumMode) {
    const sumValue = getSum(finalQueries);
    const colorResult = getMetricColor(sumValue, extractedValueMap, thresholdsToUse, metric.baseColor);
    const label = query.sum || metric.displayText || '';
    const metricValue = roundToFixed(sumValue, decimal);

    addColorDataEntry(
      colorData,
      objectId,
      label,
      colorResult.color,
      colorResult.lvl,
      metricValue,
      filling,
      unit,
      title
    );
  } else {
    finalQueries.forEach((fquery) => {
      const colorResult = getMetricColor(fquery.value, extractedValueMap, thresholdsToUse, metric.baseColor);
      const label = fquery.displayName || metric.displayText || '';
      const metricValue = roundToFixed(fquery.value, decimal);

      addColorDataEntry(
        colorData,
        objectId,
        label,
        colorResult.color,
        colorResult.lvl,
        metricValue,
        filling,
        unit,
        title
      );
    });
  }
}

function addColorDataEntry(
  colorData: ColorDataEntry[],
  object: string,
  label: string,
  color: string,
  lvl: number,
  metric: number,
  filling?: string,
  unit?: string,
  title?: string
) {
  const entry: ColorDataEntry = {
    object: object,
    label: label,
    color: color,
    lvl: lvl,
    metricValue: metric,
    filling: filling,
    unit: unit,
    title: title,
  };

  colorData.push(entry);
}

function getTitle(query: BaseRef, counter: number): string {
  return query.title && counter === 1 ? query.title : '';
}

function getSum(data: QueriesArray): number {
  return data.reduce((acc, item) => acc + item.value, 0);
}

function getThresholds(config: BaseRef, metric: Metric): Threshold[] | undefined {
  return 'thresholds' in config && config.thresholds?.length ? config.thresholds : metric.thresholds;
}

function filterData(
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

function getMetricColor(value: number, ValueMap: MetricsDataMap, thresholds?: Threshold[], baseColor?: string) {
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

function evaluateThresholdCondition(condition: string, ValueMap: MetricsDataMap): boolean {
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

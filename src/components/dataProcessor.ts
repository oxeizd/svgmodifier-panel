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
    processFinalQueries(finalQueries, query, metric, extractedValueMap, colorData, `r${counter}`);
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
    processFinalQueries(finalQueries, query, metric, extractedValueMap, colorData, `r${counter}`);
  }
}

function processFinalQueries(
  finalQueries: QueriesArray,
  query: BaseRef,
  metric: Metric,
  extractedValueMap: MetricsDataMap,
  colorData: ColorDataEntry[],
  object: string
): void {
  const sumMode = 'sum' in query && query.sum;
  const thresholdsToUse = getThresholds(query, metric);
  const { filling, decimal } = metric;
  const { unit } = query;
  let title = getTitle(query.title, 0);

  if (query.sum && sumMode) {
    const sumValue = getSum(finalQueries);
    const { color, lvl } = getMetricColor(sumValue, extractedValueMap, thresholdsToUse, metric.baseColor);
    const label = query.sum || metric.displayText || '';
    const metricValue = roundToFixed(sumValue, decimal);

    colorData.push({
      object,
      label,
      color,
      lvl,
      metricValue,
      filling,
      unit,
      title,
    });
  } else {
    finalQueries.forEach((fquery, index) => {
      const { color, lvl } = getMetricColor(fquery.value, extractedValueMap, thresholdsToUse, metric.baseColor);
      const label = fquery.displayName || metric.displayText || '';
      const metricValue = roundToFixed(fquery.value, decimal);
      title = getTitle(query.title, index);

      colorData.push({
        object,
        label,
        color,
        lvl,
        metricValue,
        filling,
        unit,
        title,
      });
    });
  }
}

function getTitle(query: BaseRef['title'], counter: number): string {
  return query && counter === 0 ? query : '';
}

function getSum(data: QueriesArray): number {
  return data.reduce((acc, item) => acc + item.value, 0);
}

function getThresholds(config: BaseRef, metric: Metric): Threshold[] | undefined {
  return 'thresholds' in config && config.thresholds?.length ? config.thresholds : metric.thresholds;
}

function filterData(data: QueriesArray, filter?: string): QueriesArray {
  if (!filter || data.length === 0) {
    return data;
  }

  const FILTER_DELIMITER = ',';
  const EXCLUSION_PREFIX = '-';
  const DATE_FILTER_PREFIX = '$date';
  const ISO_DATE_PART_INDEX = 0;

  const results: QueriesArray = [];

  const currentDate = new Date();
  const filterCondition = filter.split(FILTER_DELIMITER);

  const isExclusionFilter = (condition: string): boolean => condition.startsWith(EXCLUSION_PREFIX);

  const extractFilterValue = (condition: string): string =>
    isExclusionFilter(condition) ? condition.slice(EXCLUSION_PREFIX.length) : condition;

  const isDateFilter = (filterValue: string): boolean => filterValue.startsWith(DATE_FILTER_PREFIX);

  const parseDaysFromDateFilter = (filterValue: string): number => {
    const daysString = filterValue.replace(DATE_FILTER_PREFIX, '');
    return parseInt(daysString, 10) || 0;
  };

  const calculateTargetDate = (daysAgo: number): string => {
    const targetDate = new Date(currentDate);
    targetDate.setDate(currentDate.getDate() - daysAgo);
    return targetDate.toISOString().split('T')[ISO_DATE_PART_INDEX];
  };

  const matchesDateFilter = (filterValue: string, displayName: string): boolean => {
    if (!isDateFilter(filterValue)) {
      return false;
    }

    const daysAgo = parseDaysFromDateFilter(filterValue);
    const targetDate = calculateTargetDate(daysAgo);
    return displayName === targetDate;
  };

  const matchesPatternFilter = (filterValue: string, displayName: string): boolean =>
    !isDateFilter(filterValue) && matchPattern(filterValue, displayName);

  const shouldIncludeItem = (item: { displayName: string; value: number }): boolean => {
    for (const condition of filterCondition) {
      const trimmedCondition = condition.trim();
      const filterValue = extractFilterValue(trimmedCondition);
      const isExclusion = isExclusionFilter(trimmedCondition);

      const isMatch =
        matchesDateFilter(filterValue, item.displayName) || matchesPatternFilter(filterValue, item.displayName);

      if (isMatch) {
        return !isExclusion;
      }
    }
    return false;
  };

  // Основная логика фильтрации
  for (const item of data) {
    if (shouldIncludeItem(item)) {
      results.push(item);
    }
  }

  return results;
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

/**
 * Проверяет, legacy metrics
 */
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

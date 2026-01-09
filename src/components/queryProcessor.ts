import { compareValues, matchPattern, RegexCheck } from './utils/helpers';
import { Metric, BaseRef, Threshold, ColorDataEntry, QueryType } from '../types';
import { formatValues } from './utils/ValueTransformer';

type MetricsDataMap = Map<string, { values: Map<string, { values: string[]; timestamps: number[] }> }>;
type QueriesArray = Array<{ displayName: string; value: number; globalKey?: string }>;
type CalculationMethod = 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';

export function getMetricsData(metrics: Metric | Metric[], ValuesMap: MetricsDataMap): ColorDataEntry[] {
  const metricsArray = Array.isArray(metrics) ? metrics : [metrics];
  const colorData: ColorDataEntry[] = [];

  let counter = 1;

  for (const metric of metricsArray) {
    const processedMetric = processLegacyMetric(metric);

    processedMetric.queries?.forEach((query) => {
      const queries = queryProccessor(query, ValuesMap);

      addDataArray(queries, query, metric, ValuesMap, colorData, counter++);
    });
  }

  return colorData;
}

function queryProccessor(query: QueryType, ValuesMap: MetricsDataMap): QueriesArray {
  const queries: QueriesArray = [];

  const processRefid = (query: QueryType) => {
    const extractedData = ValuesMap.get(query.refid!);

    if (!extractedData) {
      return;
    }

    for (const [innerKey, values] of extractedData.values) {
      const value = calculateValue(values.values.map(Number), query.calculation || 'last');
      queries.push({ displayName: innerKey, value });
    }
  };

  const processLegend = (query: QueryType) => {
    for (const [globalKey, metricData] of ValuesMap) {
      for (const [innerKey, values] of metricData.values) {
        if (matchPattern(query.legend!, innerKey)) {
          queries.push({
            displayName: innerKey,
            value: calculateValue(values.values.map(Number), query.calculation || 'last'),
            globalKey,
          });
        }
      }
    }
  };

  if (query.refid) {
    processRefid(query);
  } else if (query.legend) {
    processLegend(query);
  }

  return filterData(queries, query.filter);
}

function addDataArray(
  queryResultArray: QueriesArray,
  queryParams: BaseRef,
  globalParams: Metric,
  ValuesMap: MetricsDataMap,
  colorData: ColorDataEntry[],
  counter: number
): void {
  const thresholdsToUse = getThresholds(queryParams, globalParams);
  const { filling, decimal, baseColor } = globalParams;
  const { unit, sum, title } = queryParams;

  let sumValue: number | undefined;
  let metricTitle = getTitle(title, 0);

  const addToArray = (value: number, title: string, label: string) => {
    const { color, lvl } = getMetricColor(value, ValuesMap, thresholdsToUse, baseColor);
    const displayValue = formatValues(value, unit, decimal);

    colorData.push({
      counter,
      label,
      color,
      lvl,
      metricValue: value,
      displayValue,
      filling,
      title,
    });
  };

  if (sum) {
    sumValue = getSum(queryResultArray);
    const label = queryParams.label || queryParams.sum || '';

    addToArray(sumValue, metricTitle, label);
  } else {
    queryResultArray.forEach((fquery, index) => {
      const label = getLabel(fquery.displayName, queryParams.label) || '';
      metricTitle = getTitle(queryParams.title, index);

      addToArray(fquery.value, metricTitle, label);
    });
  }
}

function getLabel(displayName: string, label?: string): string {
  if (!label) {
    label = displayName;
  }

  label = label.replace(/_prfx\d+/g, '');

  if (!RegexCheck(label)) {
    return label;
  }

  label = label.replace(/\{legend\}(.*)/, (_, afterLegend) => {
    return `${displayName} ${afterLegend.trim()}`;
  });

  return label;
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
  const GROUP_DELIMITER = '|';
  const EXCLUSION_PREFIX = '-';
  const DATE_FILTER_PREFIX = '$date';
  const ISO_DATE_PART_INDEX = 0;

  const currentDate = new Date();
  const filterGroups = filter.split(FILTER_DELIMITER);

  const isExclusionFilter = (condition: string): boolean => condition.startsWith(EXCLUSION_PREFIX);

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

  const matchesCondition = (filterValue: string, displayName: string): boolean => {
    if (isDateFilter(filterValue)) {
      const daysAgo = parseDaysFromDateFilter(filterValue);
      const targetDate = calculateTargetDate(daysAgo);
      return displayName === targetDate;
    }

    return matchPattern(filterValue, displayName);
  };

  const includeGroups: string[][] = [];
  const excludeGroups: string[][] = [];

  for (const group of filterGroups) {
    const trimmedGroup = group.trim();
    const conditions = trimmedGroup.split(GROUP_DELIMITER).map((cond) => cond.trim());

    if (isExclusionFilter(trimmedGroup)) {
      const excludeConditions = conditions.map((cond) =>
        isExclusionFilter(cond) ? cond.slice(EXCLUSION_PREFIX.length) : cond
      );
      excludeGroups.push(excludeConditions);
    } else {
      includeGroups.push(conditions);
    }
  }

  return data.filter((item) => {
    for (const excludeGroup of excludeGroups) {
      const shouldExclude = excludeGroup.some((condition) => matchesCondition(condition, item.displayName));
      if (shouldExclude) {
        return false;
      }
    }

    if (includeGroups.length > 0) {
      const shouldInclude = includeGroups.some((group) =>
        group.some((condition) => matchesCondition(condition, item.displayName))
      );
      return shouldInclude;
    }

    return true;
  });
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
  let color = baseColor || undefined;
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

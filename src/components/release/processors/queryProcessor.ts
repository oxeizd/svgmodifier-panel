import { DataFrameMap } from './dataExtractor';
import { formatValues } from 'components/utils/ValueTransformer';
import { compareValues, getMappingMatch, matchPattern } from 'components/utils/helpers';
import {
  Metric,
  BaseRef,
  Threshold,
  VizData,
  TableVizData,
  QueryType,
  ValueMapping,
  CalculationMethod,
  SingleTableData,
} from 'src/../types';

type QueriesArray = Array<{ legend: string; value: number; globalKey?: string }>;
type columnData = { headers: any[]; columns: any[] };

const defaultConfig = {
  filter: undefined,
  sum: undefined,
  label: undefined,
  unit: undefined,
  title: undefined,
  decimal: 2,
  filling: 'fill' as const,
  baseColor: undefined,
  calculation: 'last' as const,
  thresholdKey: undefined,
  thresholds: undefined,
};

export function getMetricsDataV2(id: string, metrics: Metric[], dataFrame: DataFrameMap, mapping?: ValueMapping[]) {
  if (!dataFrame?.size || !metrics?.length) {
    return { vizData: [], tableData: undefined };
  }

  const vizData: VizData[] = [];
  const tableData: TableVizData[] = [];

  let counter = 1;
  for (const metric of metrics) {
    const processedMetric = processLegacyMetric(metric);

    processedMetric.queries?.forEach((query) => {
      const config = getConfig(query, metric);
      const queriesData = queryProccessor(query, dataFrame, config);

      if (queriesData.columnData) {
        addTableDataEntries(queriesData.columnData, config, tableData, counter++, dataFrame, id, mapping);
      }

      addVizDataEntries(queriesData.queries, config, dataFrame, vizData, counter++, mapping);
    });
  }
  
  return {
    vizData,
    tableData: tableData.length > 0 ? tableData : undefined,
  };
}

function getConfig(queryConfig: BaseRef, metricConfig: Metric) {
  return Object.fromEntries(
    Object.entries(defaultConfig).map(([key, defaultValue]) => {
      const typedKey = key as keyof typeof defaultConfig;

      const fromquery = queryConfig[typedKey];
      const fromMetric = typedKey in metricConfig ? (metricConfig as Record<string, any>)[typedKey] : undefined;

      return [key, fromquery ?? fromMetric ?? defaultValue];
    })
  ) as { [K in keyof typeof defaultConfig]: (typeof defaultConfig)[K] };
}

function queryProccessor(query: QueryType, dataFrame: DataFrameMap, config: typeof defaultConfig) {
  let queries: QueriesArray = [];
  let columnData: columnData | undefined = { headers: [], columns: [] };

  const processRefid = (ref: string) => {
    const extractedData = dataFrame.get(ref);

    if (!extractedData) {
      return;
    }

    if (extractedData.type === 'table') {
      const valuesArray = Array.from(extractedData.values.values()).map((item) => item.values.map(Number));
      const maxLength = Math.max(...valuesArray.map((arr) => arr.length));

      const headers = Array.from(extractedData.values.keys());
      columnData.headers.push(headers);

      for (let i = 0; i < maxLength; i++) {
        const row = [];

        for (const [_, values] of extractedData.values) {
          if (i < values.values.length) {
            row.push(values.values[i]);
          } else {
            row.push(null);
          }
        }
        columnData.columns.push(row);
      }
    } else {
      for (const [innerKey, values] of extractedData.values) {
        const value = calculateValue(values.values.map(Number), config.calculation);
        queries.push({ legend: innerKey, value });
      }
    }
  };

  const processLegend = (legend: string) => {
    for (const [globalKey, metricData] of dataFrame) {
      for (const [innerKey, values] of metricData.values) {
        if (matchPattern(legend, innerKey)) {
          queries.push({
            legend: innerKey,
            value: calculateValue(values.values.map(Number), config.calculation),
            globalKey,
          });
        }
      }
    }
  };

  if (query.refid) {
    processRefid(query.refid);
  } else if (query.legend) {
    processLegend(query.legend);
  }

  if (config.filter) {
    queries = filterData(queries, config.filter);
  }

  return { queries, columnData: columnData.headers.length > 0 ? columnData : undefined };
}

function addVizDataEntries(
  queries: QueriesArray,
  config: typeof defaultConfig,
  dataFrame: DataFrameMap,
  vizData: VizData[],
  counter: number,
  mapping?: ValueMapping[]
): void {
  const addData = (value: number, title: string, label: string) => {
    let displayValue = formatValues(value, config.unit, config.decimal);

    if (mapping) {
      displayValue = getMappingMatch(mapping, value, config.decimal) ?? displayValue;
    }

    const { color, lvl } = getMetricColor(value, dataFrame, config.thresholds, config.baseColor);

    vizData.push({
      counter,
      label,
      color,
      lvl,
      metricValue: value,
      displayValue,
      filling: config.filling,
      title,
    });
  };

  if (config.sum && queries.length > 0) {
    const value = getSum(queries);
    const title = getTitle(config.title, 0);
    const label = getLabel(config.sum, config.label) || '';
    addData(value, title, label);

    return;
  }

  queries.forEach((query, index) => {
    const value = query.value;
    const title = getTitle(config.title, index);
    const label = getLabel(query.legend, config.label) || '';
    addData(value, title, label);
  });
}

function addTableDataEntries(
  columnData: columnData,
  config: typeof defaultConfig,
  tableData: TableVizData[],
  counter: number,
  valueMap: DataFrameMap,
  id: string,
  mapping?: ValueMapping[]
): void {
  let filteredColumnData = columnData;
  if (config.filter) {
    const filteredData = filterTableData(columnData, config.filter);
    if (!filteredData) {
      return; // Если фильтр ничего не нашел, пропускаем эту таблицу
    }
    filteredColumnData = filteredData;
  }

  let tableVizData = tableData.find((item) => item.id === id);

  if (!tableVizData) {
    tableVizData = {
      id: id,
      tables: [],
    };
    tableData.push(tableVizData);
  }

  const newTable: SingleTableData = {
    counter: counter,
    headers: filteredColumnData.headers,
    columnsData: [],
    filling: config.filling,
    title: config.title,
  };

  let thKeyIndex: number | undefined;

  if (config.thresholdKey) {
    thKeyIndex = filteredColumnData.headers[0].findIndex((item: string) => item === config.thresholdKey);
  }

  for (let i = 0; i < filteredColumnData.columns.length; i++) {
    const currentRow = filteredColumnData.columns[i];
    let color: string | undefined;
    let lvl: number | undefined;

    if (thKeyIndex !== undefined) {
      const valueAtIndex = currentRow[thKeyIndex];

      const metricResult = getMetricColor(valueAtIndex, valueMap, config.thresholds, config.baseColor);
      color = metricResult.color;
      lvl = metricResult.lvl;

      if (mapping) {
        const displayValue = getMappingMatch(mapping, valueAtIndex);
        if (displayValue) {
          currentRow[thKeyIndex] = displayValue;
        }
      }
    }

    newTable.columnsData.push({
      color: color,
      lvl: lvl,
      row: currentRow,
    });
  }

  // Сохраняем цвет последнего элемента в tableVizData
  if (newTable.columnsData.length > 0) {
    tableVizData.color = newTable.columnsData[newTable.columnsData.length - 1].color;
  }

  tableVizData.tables.push(newTable);
}

function getLabel(displayName: string, label?: string): string {
  if (!label) {
    label = displayName;
  }

  label = label.replace(/_prfx\d+/g, '').replace(/\{{legend\}}/g, displayName);

  return label;
}

function getTitle(query: BaseRef['title'], counter: number): string {
  return query && counter === 0 ? query : '';
}

function getSum(data: QueriesArray): number {
  return data.reduce((acc, item) => acc + item.value, 0);
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
      const shouldExclude = excludeGroup.some((condition) => matchesCondition(condition, item.legend));
      if (shouldExclude) {
        return false;
      }
    }

    if (includeGroups.length > 0) {
      const shouldInclude = includeGroups.some((group) =>
        group.some((condition) => matchesCondition(condition, item.legend))
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

function getMetricColor(value: number, dataFrame: DataFrameMap, thresholds?: Threshold[], baseColor?: string) {
  let lvl = 0;
  let color = baseColor;

  thresholds?.forEach((threshold, index) => {
    if (threshold.condition && !evaluateThresholdCondition(threshold.condition, dataFrame)) {
      return;
    }

    const comparisonResult = compareValues(value, threshold.value, threshold.operator || '>=');

    if (comparisonResult) {
      color = threshold.color;
      lvl = threshold.lvl || index + 1;
    }
  });

  return { color, lvl };
}

export function getMath(expression: string, dataFrame: DataFrameMap) {
  const variableRegex =
    /\$([А-Яа-яЁёA-Za-z0-9_]+)(?:\.([А-Яа-яЁёA-Za-z0-9_ -]+))?(?::(last|total|max|min|count|delta))?/g;

  return String(
    expression.replace(
      variableRegex,
      (_match: string, refId: string, subKey: string, calculationMethod: CalculationMethod = 'last') => {
        if (refId !== undefined) {
          refId = refId.trim();
          const metricData = dataFrame.get(refId);
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
    )
  );
}

function evaluateThresholdCondition(condition: string, dataFrame: DataFrameMap): boolean {
  let result = false;

  try {
    const now = new Date();
    const timezone = parseInt(condition.match(/timezone\s*=\s*(-?\d+)/)?.[1] || '3', 10);
    const hour = (now.getUTCHours() + timezone + 24) % 24;
    const sanitizedCondition = condition.replace(/timezone\s*=\s*(-?\d+),?/, '').trim();

    const metricsCondition = getMath(sanitizedCondition, dataFrame);

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
 * Расширенная фильтрация таблицы с поддержкой:
 * - 'Название колонки, Ci231*' - фильтр по одной колонке
 * - 'Название колонки, Ci231*|Другая колонка, значение' - ИЛИ условия
 * - 'Название колонки, Ci231*;Другая колонка, значение' - И условия
 */
/**
 * Расширенная фильтрация таблицы с поддержкой:
 * - 'Название колонки, Ci231*' - фильтр по одной колонке
 * - 'Название колонки, Ci231*|Другая колонка, значение' - ИЛИ условия
 * - 'Название колонки, Ci231*;Другая колонка, значение' - И условия
 */
function filterTableData(columnData: columnData, filter: string): columnData | undefined {
  const OR_DELIMITER = '|';

  // Разделяем на условия ИЛИ
  const orConditions = filter.split(OR_DELIMITER).map((cond) => cond.trim());

  const filteredRows: any[] = [];

  // Для каждой строки проверяем условия
  for (let i = 0; i < columnData.columns.length; i++) {
    const row = columnData.columns[i];
    let matches = false;

    // Проверяем каждое условие ИЛИ
    for (const orCondition of orConditions) {
      if (checkAndConditions(row, orCondition, columnData.headers[0])) {
        matches = true;
        break; // Достаточно одного совпадения по ИЛИ
      }
    }

    if (matches) {
      filteredRows.push(row);
    }
  }

  if (filteredRows.length === 0) {
    return undefined;
  }

  return {
    headers: columnData.headers,
    columns: filteredRows,
  };
}

function checkAndConditions(row: any[], andCondition: string, headers: any[]): boolean {
  const AND_DELIMITER = ';';
  const conditions = andCondition.split(AND_DELIMITER).map((cond) => cond.trim());

  // Все условия И должны выполняться
  for (const condition of conditions) {
    const FILTER_DELIMITER = ',';
    const parts = condition.split(FILTER_DELIMITER).map((part) => part.trim());

    if (parts.length < 2) {
      continue; // Пропускаем некорректные условия
    }

    const columnName = parts[0];
    const filterValue = parts.slice(1).join(','); // На случай, если в значении есть запятые

    const columnIndex = headers.findIndex((header: string) => header === columnName);

    if (columnIndex === -1) {
      return false; // Колонка не найдена - условие не выполняется
    }

    const cellValue = String(row[columnIndex] || '');

    if (!matchPattern(filterValue, cellValue)) {
      return false; // Значение не соответствует - условие не выполняется
    }
  }

  return true; // Все условия И выполнены
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

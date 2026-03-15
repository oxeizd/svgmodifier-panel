import { matchPattern } from '../utils';
import { formatValues } from './valueTransformer';
import { defaultConfig, getConfig } from './constants';
import { DataFrameEntry, DataFrameMap } from '../extractor/dataExtractor';
import { processLegacyMetric, getMappingMatch, calculateValue, getMetricColor, checkFilter } from './utils';
import { QuerySpecificSettings, Metrics, ValueMapping, QueryType, MetricData, TableMetricData } from '../../types';

export type QueriesArray = {
  fields?: MetricData[];
  tables?: TableMetricData[];
};

type Fields = Array<{ legend: string; value: number; globalKey?: string }>;

export function getMetricsData(
  metrics: Metrics[],
  dataFrame: DataFrameMap,
  mapping?: ValueMapping[]
): QueriesArray | undefined {
  if (!dataFrame?.size || !metrics?.length) {
    return undefined;
  }

  const queriesArray: QueriesArray = { fields: [], tables: [] };
  let nextCounter = 1;
  const getNextCounter = () => nextCounter++;

  for (const metric of metrics) {
    const processedMetric = processLegacyMetric(metric);

    processedMetric.queries?.forEach((query) => {
      const config = getConfig(query, metric);
      getQueriesFromDataFrame(query, queriesArray, dataFrame, config, getNextCounter, mapping);
    });
  }

  console.log(queriesArray);
  return queriesArray;
}

function getQueriesFromDataFrame(
  query: QueryType,
  queriesArray: QueriesArray,
  dataFrame: DataFrameMap,
  config: typeof defaultConfig,
  getNextCounter: () => number,
  mapping?: ValueMapping[]
) {
  if (query.refid) {
    const extractedData = dataFrame.get(query.refid);

    if (!extractedData) {
      return;
    }

    if (extractedData.dataSourceName) {
      query.dataSourceName = extractedData.dataSourceName;
    }

    if (extractedData.type === 'table') {
      const table = processTable(extractedData, dataFrame, getNextCounter, config, mapping);
      if (table) {
        queriesArray.tables?.push(table);
      }
    } else {
      const fields: Fields = [];
      for (const [innerKey, values] of extractedData.values) {
        if (checkFilter(innerKey, config.filter)) {
          const value = calculateValue(values.values.map(Number), config.calculation);
          fields.push({ legend: innerKey, value });
        }
      }
      processFields(fields, queriesArray, config, dataFrame, getNextCounter, mapping);
    }
  }

  if (query.legend) {
    const fields: Fields = [];
    for (const [globalKey, metricData] of dataFrame) {
      for (const [innerKey, values] of metricData.values) {
        if (matchPattern(query.legend, innerKey) && checkFilter(innerKey, config.filter)) {
          if (metricData.dataSourceName) {
            query.dataSourceName = metricData.dataSourceName;
          }
          const value = calculateValue(values.values.map(Number), config.calculation);
          fields.push({ legend: innerKey, value, globalKey });
        }
      }
    }
    processFields(fields, queriesArray, config, dataFrame, getNextCounter, mapping);
  }
}

function processFields(
  fields: Fields,
  queriesArray: QueriesArray,
  config: typeof defaultConfig,
  dataFrame: DataFrameMap,
  getNextCounter: () => number,
  mapping?: ValueMapping[]
) {
  if (fields.length === 0) {
    return;
  }

  const addToArray = (value: number, title: string, label: string) => {
    let displayValue = formatValues(value, config.unit, config.decimal);

    if (mapping) {
      displayValue = getMappingMatch(mapping, value, config.decimal) ?? displayValue;
    }

    const { color, lvl } = getMetricColor(value, dataFrame, config.thresholds, config.baseColor);

    queriesArray.fields?.push({
      counter: getNextCounter(),
      label,
      color,
      lvl,
      metricValue: value,
      displayValue,
      filling: config.filling,
      title,
    });
  };

  if (config.sum) {
    const value = getSum(fields);
    const title = getTitle(config.title, 0);
    const label = getLabel(config.sum, config.label) || '';

    addToArray(value, title, label);
    return;
  }

  fields.forEach((query, index) => {
    const value = query.value;
    const title = getTitle(config.title, index);
    const label = getLabel(query.legend, config.label) || '';

    addToArray(value, title, label);
  });
}

function processTable(
  extractedData: DataFrameEntry,
  dataFrame: DataFrameMap,
  getNextCounter: () => number,
  config: typeof defaultConfig,
  mapping?: ValueMapping[]
) {
  const headers = Array.from(extractedData.values.keys());
  const colCount = headers.length;
  const rowCount = extractedData.length;

  if (!rowCount || !colCount) {
    return;
  }

  const columns = Array.from(extractedData.values.values()).map((col) => col.values);

  const table: TableMetricData = {
    counter: getNextCounter(),
    headers: headers,
    columnsData: [],
    filling: config.filling,
    title: config.title,
    label: '',
    metricValue: 0,
  };

  let maxLvl = -1;
  let thKeyIndex: number | undefined;

  if (config.thresholdKey) {
    thKeyIndex = headers.findIndex((item: string) => item === config.thresholdKey);
  }

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row = columns.map((col) => col[rowIndex]);

    if (config.filter) {
      const passes = headers.every((header, i) => checkFilter(String(row[i]), config.filter, header));
      if (!passes) {
        continue;
      }
    }

    let color: string | undefined;
    let lvl: number | undefined = -1;

    if (thKeyIndex !== undefined && thKeyIndex !== -1) {
      const rawValue = row[thKeyIndex];
      const numericValue = Number(rawValue);
      let displayValue = formatValues(numericValue, config.unit, config.decimal);

      if (!isNaN(numericValue)) {
        const result = getMetricColor(numericValue, dataFrame, config.thresholds, config.baseColor);
        lvl = result.lvl;
        color = result.color;

        if (lvl > maxLvl) {
          maxLvl = lvl;
        }
      }

      if (mapping) {
        displayValue = getMappingMatch(mapping, numericValue, config.decimal) ?? displayValue;
      }

      if (displayValue) {
        row[thKeyIndex] = displayValue;
      }
    }

    table.columnsData.push({ row, color, lvl });
  }

  if (table.columnsData.length === 0) {
    return;
  }
  table.lvl = maxLvl !== -1 ? maxLvl : 0;
  table.color = table.columnsData[table.columnsData.length - 1].color;

  if (thKeyIndex !== undefined && thKeyIndex !== -1) {
    table.label = headers[thKeyIndex];
    table.metricValue = table.columnsData[table.columnsData.length - 1].row[thKeyIndex];
  }

  return table;
}

function getLabel(displayName: string, label?: string): string {
  if (!label) {
    label = displayName;
  }

  label = label.replace(/_prfx\d+/g, '').replace(/\{\{legend\}\}/g, displayName);
  return label;
}

function getTitle(query: QuerySpecificSettings['title'], counter: number): string {
  return query && counter === 0 ? query : '';
}

function getSum(data: Fields): number {
  return data.reduce((acc, item) => acc + item.value, 0);
}

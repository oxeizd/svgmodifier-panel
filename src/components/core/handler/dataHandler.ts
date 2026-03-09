import { matchPattern } from '../utils';
import { filterData } from './metricsfilter';
import { formatValues } from './ValueTransformer';
import { defaultConfig } from './constants';
import { DataFrameMap } from '../extractor/dataExtractor';
import { processLegacyMetric, getMappingMatch, calculateValue, getMetricColor } from './metricsUtils';
import { QuerySpecificSettings, Metrics, ValueMapping, QueryType, MetricData, TableMetricData } from '../../types';

export type singleData = { legend: string; value: number; globalKey?: string };
export type tableData = { headers: string[]; rows: any[][] };

export type QueriesArray = {
  singleData?: singleData[] | undefined;
  tableData?: tableData[] | undefined;
};

export function getMetricsData(metrics: Metrics[], dataFrame: DataFrameMap, mapping?: ValueMapping[]) {
  if (!dataFrame?.size || !metrics?.length) {
    return undefined;
  }

  let counter = 1;
  const metricsData: MetricData[] = [];
  const tableMetricData: TableMetricData[] = [];

  for (const metric of metrics) {
    const processedMetric = processLegacyMetric(metric);

    processedMetric.queries?.forEach((query) => {
      let queries;

      const config = getConfig(query, metric);
      queries = getQueriesFromDataFrame(query, dataFrame, config);

      if (config.filter) {
        queries = filterData(queries, config.filter);
      }

      const resultData = applyConfigForQueries(queries, config, dataFrame, counter++, mapping);

      if (resultData.metricsData?.length) {
        metricsData.push(...resultData.metricsData);
      }

      if (resultData.tableMetricData?.length) {
        tableMetricData.push(...resultData.tableMetricData);
      }
    });
  }

  return { metricsData, tableMetricData };
}

function getConfig(queryConfig: QuerySpecificSettings, metricConfig: Metrics) {
  return Object.fromEntries(
    Object.entries(defaultConfig).map(([key, defaultValue]) => {
      const typedKey = key as keyof typeof defaultConfig;

      const fromquery = queryConfig[typedKey];
      const fromMetric = typedKey in metricConfig ? (metricConfig as Record<string, any>)[typedKey] : undefined;

      return [key, fromquery ?? fromMetric ?? defaultValue];
    })
  ) as { [K in keyof typeof defaultConfig]: (typeof defaultConfig)[K] };
}

function getQueriesFromDataFrame(query: QueryType, dataFrame: DataFrameMap, config: typeof defaultConfig) {
  const processRefid = (ref: string) => {
    const extractedData = dataFrame.get(ref);

    if (!extractedData) {
      return;
    }

    if (extractedData.type === 'table') {
      const rowCount = extractedData.length;
      const colCount = extractedData.values.size;
      const headers = Array.from(extractedData.values.keys());

      if (rowCount && colCount) {
        const rows: any[][] = new Array(rowCount);

        for (let i = 0; i < rowCount; i++) {
          rows[i] = new Array(colCount);
        }

        let colIndex = 0;
        for (const [_, values] of extractedData.values) {
          for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            rows[rowIndex][colIndex] = values.values[rowIndex];
          }
          colIndex++;
        }

        queriesArray.tableData?.push({ headers, rows });
      }
    } else {
      for (const [innerKey, values] of extractedData.values) {
        const value = calculateValue(values.values.map(Number), config.calculation);
        queriesArray.singleData?.push({ legend: innerKey, value });
      }
    }
  };

  const processLegend = (legend: string) => {
    for (const [globalKey, metricData] of dataFrame) {
      for (const [innerKey, values] of metricData.values) {
        if (matchPattern(legend, innerKey)) {
          queriesArray.singleData?.push({
            legend: innerKey,
            value: calculateValue(values.values.map(Number), config.calculation),
            globalKey,
          });
        }
      }
    }
  };

  let queriesArray: QueriesArray = { singleData: [], tableData: [] };

  if (query.refid) {
    processRefid(query.refid);
  } else if (query.legend) {
    processLegend(query.legend);
  }

  return queriesArray;
}

function applyConfigForQueries(
  queriesArray: QueriesArray,
  config: typeof defaultConfig,
  dataFrame: DataFrameMap,
  counter: number,
  mapping?: ValueMapping[]
) {
  const addSingleData = (metricsData: MetricData[]) => {
    if (queriesArray.singleData && queriesArray.singleData?.length > 0) {
      const addToArray = (value: number, title: string, label: string, firing?: string) => {
        let displayValue = formatValues(value, config.unit, config.decimal);

        if (mapping) {
          displayValue = getMappingMatch(mapping, value, config.decimal) ?? displayValue;
        }

        const { color, lvl } = getMetricColor(value, dataFrame, config.thresholds, config.baseColor);

        metricsData.push({
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

      if (config.sum) {
        const value = getSum(queriesArray.singleData);
        const title = getTitle(config.title, 0);
        const label = getLabel(config.sum, config.label) || '';

        addToArray(value, title, label);
        return;
      }

      queriesArray.singleData.forEach((query, index) => {
        const value = query.value;
        const title = getTitle(config.title, index);
        const label = getLabel(query.legend, config.label) || '';

        addToArray(value, title, label);
      });
    }
  };

  const addTableData = (tableMetricData: TableMetricData[]) => {
    const tableData = queriesArray.tableData;

    if (tableData && tableData.length > 0) {
      tableData.forEach((table) => {
        let thKeyIndex: number | undefined;

        const newTable: TableMetricData = {
          counter: counter,
          headers: table.headers,
          columnsData: [],
          filling: config.filling,
          title: config.title,
        };

        if (config.thresholdKey) {
          thKeyIndex = table.headers.findIndex((item: string) => item === config.thresholdKey);
        }

        for (let i = 0; i < table.rows.length; i++) {
          const currentRow = table.rows[i];
          let color: string | undefined;
          let lvl: number | undefined;

          if (thKeyIndex !== undefined) {
            const valueAtIndex = currentRow[thKeyIndex];

            const result = getMetricColor(valueAtIndex, dataFrame, config.thresholds, config.baseColor);
            color = result.color;
            lvl = result.lvl;

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

        if (newTable.columnsData.length > 0) {
          newTable.maxColor = newTable.columnsData[newTable.columnsData.length - 1].color;
        }

        tableMetricData.push(newTable);
      });
    }
  };

  const metricsData: MetricData[] = [];
  const tableMetricData: TableMetricData[] = [];

  if (queriesArray.singleData) {
    addSingleData(metricsData);
  }

  if (queriesArray.tableData) {
    addTableData(tableMetricData);
  }

  return { metricsData, tableMetricData };
}

function getLabel(displayName: string, label?: string): string {
  if (!label) {
    label = displayName;
  }

  label = label.replace(/_prfx\d+/g, '').replace(/\{{legend\}}/g, displayName);
  return label;
}

function getTitle(query: QuerySpecificSettings['title'], counter: number): string {
  return query && counter === 0 ? query : '';
}

function getSum(data: QueriesArray['singleData']): number {
  return data!.reduce((acc, item) => acc + item.value, 0);
}

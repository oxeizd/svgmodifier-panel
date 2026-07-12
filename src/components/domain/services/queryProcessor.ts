import { QueriesArray } from '../../domain/services/dataHandler';
import { NotifyOptions } from './processor';
import { ConfigRules, MetricData, TableMetricData, Tooltip, TooltipContent } from 'components/domain/models';

type dsNames = Array<[string, string]>;

export function findBestQuery(
  id: string,
  queries: QueriesArray,
  attributes: ConfigRules['attributes'],
  tooltip: TooltipContent[] | undefined,
  notifyOptions: NotifyOptions
) {
  const dsNames: dsNames = [];

  let bestLvl = Number.NEGATIVE_INFINITY;
  let bestMetric = Number.NEGATIVE_INFINITY;
  let bestEntry: MetricData | TableMetricData | undefined;
  let bestAttributes: ConfigRules['attributes'] | undefined = undefined;

  if (queries.fields && queries.fields.length > 0) {
    for (const field of queries.fields) {
      const currentLvl = field.lvl ?? Number.NEGATIVE_INFINITY;
      const currentMetric = field.metricValue ?? Number.NEGATIVE_INFINITY;

      if (notifyOptions.show && field.dsName && field.refId) {
        collectDataSource(field, notifyOptions.threshold, dsNames);
      }

      if (currentLvl > bestLvl || (currentLvl === bestLvl && currentMetric > bestMetric)) {
        bestLvl = currentLvl;
        bestMetric = currentMetric;
        bestEntry = field;
        bestAttributes = attributes;
      }

      if (attributes?.tooltip && attributes.tooltip.show) {
        pushTooltipItem(id, field, attributes.tooltip, tooltip);
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
        pushTooltipItem(id, table, attributes.tooltip, tooltip);
      }
    }
  }

  return { dsNames, bestLvl, bestMetric, bestAttributes, bestEntry };
}

function collectDataSource(field: MetricData | TableMetricData, threshold: number | undefined, dsNames: dsNames) {
  const currentMetric = field.metricValue ?? Number.NEGATIVE_INFINITY;
  const currentLvl = field.lvl ?? Number.NEGATIVE_INFINITY;

  if (field.dsName && field.refId) {
    if (threshold && currentMetric >= threshold) {
      dsNames.push([field.dsName, field.refId]);
    } else if (currentLvl > 0) {
      dsNames.push([field.dsName, field.refId]);
    }
  }
}

function isTableMetricData(field: MetricData | TableMetricData): field is TableMetricData {
  return 'columnsData' in field;
}

function pushTooltipItem(
  id: string,
  field: MetricData | TableMetricData,
  tooltipCfg: Tooltip,
  tooltipArray: TooltipContent[] | undefined
) {
  if (!tooltipArray) {
    return;
  }

  const { textAbove, textBelow } = tooltipCfg;
  const tooltipItem = tooltipArray.find((item) => item.id === id);

  if (isTableMetricData(field)) {
    const tableData = {
      headers: field.headers,
      columnsData: field.columnsData,
      title: field.title,
    };

    if (!tooltipItem) {
      tooltipArray.push({
        id: id,
        queryTableData: [tableData],
        textAbove: textAbove,
        textBelow: textBelow,
      });
    } else {
      if (!tooltipItem.queryTableData) {
        tooltipItem.queryTableData = [];
      }

      tooltipItem.queryTableData.push(tableData);
    }
  } else {
    const queryData = {
      label: field.label,
      metric: field.displayValue || field.metricValue.toString(),
      color: field.color,
      title: field.title,
    };

    if (!tooltipItem) {
      tooltipArray.push({
        id: id,
        queryData: [queryData],
        textAbove: textAbove,
        textBelow: textBelow,
      });
    } else {
      tooltipItem.queryData?.push(queryData);
    }
  }
}

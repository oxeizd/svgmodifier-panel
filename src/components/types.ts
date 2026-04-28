export interface ConfigRules {
  id: string | string[];
  attributes: {
    autoConfig?: boolean;
    link?: string | string[];
    tooltip?: Tooltip;
    label?: string;
    labelColor?: string;
    styles?: Styles;
    valueMapping?: ValueMapping[];
    metrics?: Metrics[];
  };
}

export interface Styles {
  stroke?: {
    color?: string;
    width?: number | string;
    thresholds?: Threshold[];
  };
  fill?: {
    color?: string;
    opacity?: number;
    thresholds?: Threshold[];
  };
  text?: {
    value?: string;
    size?: number | string;
    color?: string;
    thresholds?: Threshold[];
  };
}

export interface Tooltip {
  show: boolean;
  mode?: 'deafult' | 'table';
  textAbove?: string;
  textBelow?: string;
}

export interface ValueMapping {
  condition: string;
  value: number;
  label: string;
}

export interface Metrics extends GeneralMetricSettings {
  queries?: QueryType[];
}

export type QueryType =
  | ({ legend: string; refid?: never } & QuerySpecificSettings)
  | ({ refid: string; legend?: never } & QuerySpecificSettings);

export interface GeneralMetricSettings {
  calculation?: CalculationMethod;
  label?: string;
  unit?: string;
  title?: string;
  decimal?: number;
  filling?: string;
  baseColor?: string;
  thresholdKey?: string;
  thresholds?: Threshold[];
  dataSourceName?: string;
}

export interface QuerySpecificSettings extends GeneralMetricSettings {
  filter?: filter;
  sum?: string;
}

export type filter = {
  include: Record<string, string[]>;
  exclude: Record<string, string[]>;
};

export type CalculationMethod = 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';

export interface Threshold {
  color: string;
  value: number;
  lvl?: number;
  operator?: '=' | '>' | '<' | '>=' | '!=' | '<=';
  condition?: string;
}

export interface TooltipContent {
  id: string;
  queryData?: Array<{
    label: string;
    metric: string;
    color: string | undefined;
    title?: string;
  }>;
  queryTableData?: Array<{
    headers: any[][];
    columnsData: Array<{
      color: string | undefined;
      row: any[];
    }>;
    title?: string | undefined;
  }>;
  textAbove?: string | string[] | undefined;
  textBelow?: string | string[] | undefined;
}

export interface DataMap {
  SVGElem: SVGElement | null;
  additional: Array<{
    selector: number[] | undefined;
    elemIndex: number;
    elemsLength: number;
    attributes: ConfigRules['attributes'];
  }>;
}

export interface MetricData {
  counter: number;
  label: string;
  color: string | undefined;
  lvl: number;
  metricValue: number;
  displayValue?: string;
  filling?: string | undefined;
  title?: string | undefined;
  dsName?: string;
}

export interface TableMetricData {
  counter: number;
  headers: any[];
  columnsData: Array<{
    row: any[];
    color: string | undefined;
    lvl: number | undefined;
  }>;
  label: string;
  metricValue: number;
  displayValue?: string;
  filling?: string | undefined;
  title?: string | undefined;
  color?: string | undefined;
  lvl?: number | undefined;
  dsName?: string;
}

export interface NotificationTooltip {
  enable: boolean;
  header: 'Влияние оказано на';
  count: number | 0;
  dataSourceName: string[] | undefined;
  show: boolean;
}

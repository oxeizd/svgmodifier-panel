export interface PanelOptions {
  jsonData: {
    svgCode: string;
    metricsMapping: string;
    svgAspectRatio: string;
    customRelativeTime: string;
    fieldsCustomRelativeTime: string;
  };
  transformations: {
    expressions: Expr[];
  };
  tooltip: {
    sort: 'none' | 'ascending' | 'descending';
    maxWidth: number;
    valuePosition: 'standard' | 'right';
    hideZeros: boolean;
  };
}

export interface Expr {
  refId: string;
  expression: string;
}

export interface Change {
  id: string | string[];
  attributes: {
    autoConfig?: boolean;
    link?: string | string[];
    tooltip?: Tooltip;
    label?: string;
    labelColor?: string;
    styles?: Styles;
    valueMapping?: ValueMapping[];
    metrics?: Metric[];
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

export interface BaseSettings {
  calculation?: CalculationMethod;
  label?: string;
  unit?: string;
  title?: string;
  decimal?: number;
  filling?: string;
  baseColor?: string;
  thresholds?: Threshold[];
}

export interface Metric extends BaseSettings {
  queries?: QueryType[];
}

export type QueryType = ({ legend: string; refid?: never } & BaseRef) | ({ refid: string; legend?: never } & BaseRef);

export interface BaseRef extends BaseSettings {
  filter?: string;
  sum?: string;
}

export interface Tooltip {
  show: boolean;
  mode?: 'deafult' | 'table';
  textAbove?: string;
  textBelow?: string;
}

export interface TooltipContent {
  id: string;
  label: string;
  metric: string;
  color: string;
  mode?: 'deafult' | 'table';
  title?: string;
  textAbove?: string;
  textBelow?: string;
}

export interface ValueMapping {
  condition: string;
  value: number;
  label: string;
}

export interface Threshold {
  color: string;
  value: number;
  lvl?: number;
  operator?: '=' | '>' | '<' | '>=' | '!=' | '<=';
  condition?: string;
}

export interface VizData {
  counter: number;
  label: string;
  color: string | undefined;
  lvl: number;
  metricValue: number;
  displayValue?: string;
  filling?: string | undefined;
  title?: string | undefined;
}

export interface DataMap {
  SVGElem: SVGElement | null;
  additional: Array<{
    selector: string | undefined;
    elemIndex: number;
    elemsLength: number;
    attributes: Change['attributes'];
    vizData?: VizData[] | undefined;
  }>;
  attributes?: Change['attributes'] | undefined;
  maxEntry?: VizData | undefined;
}

export type CalculationMethod = 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';

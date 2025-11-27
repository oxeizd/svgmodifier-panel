export interface Change {
  id: string | string[];
  attributes: {
    autoConfig?: boolean;
    link?: string | string[];
    tooltip?: Tooltip;
    label?: string;
    labelColor?: string;
    valueMapping?: ValueMapping[];
    metrics?: Metric | Metric[];
  };
}

export interface Metric {
  queries?: QueryType[];
  displayText?: string;
  filling?: string;
  baseColor?: string;
  thresholds?: Threshold[];
  decimal?: number;
}

export type QueryType = ({ legend: string; refid?: never } & BaseRef) | ({ refid: string; legend?: never } & BaseRef);

export interface BaseRef {
  filter?: string;
  calculation?: 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';
  label?: string;
  sum?: string;
  unit?: string;
  title?: string;
  thresholds?: Threshold[];
}

export interface Tooltip {
  show: boolean;
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

export interface TooltipContent {
  id: string;
  label: string;
  metric: string;
  color: string;
  title?: string;
  textAbove?: string;
  textBelow?: string;
}

export interface ColorDataEntry {
  object: string;
  label: string;
  color: string;
  lvl: number;
  metricValue: number;
  filling?: string;
  unit?: string;
  title?: string;
}

export type DataMap = {
  SVGElem: SVGElement;
  additional: Array<{
    schema: string;
    attributes: Change['attributes'];
    colorData: ColorDataEntry[];
  }>;
  attributes?: Change['attributes'] | undefined;
  maxEntry?: ColorDataEntry;
};

export interface PanelOptions {
  jsonData: {
    svgCode: string;
    metricsMapping: string;
    svgAspectRatio: string;
    customRelativeTime: string;
    fieldsCustomRelativeTime: string;
  };
}

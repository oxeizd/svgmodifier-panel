export interface Threshold {
  color: string;
  value: number;
  lvl?: number;
  operator?: '=' | '>' | '<' | '>=' | '!=' | '<=';
  condition?: string;
}

export interface RefIds {
  refid: string;
  filter?: string;
  calculation?: 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';
  label?: string;
  sum?: string;
  unit?: string;
  thresholds: Threshold[];
}

export interface Legends {
  legend: string;
  filter?: string;
  calculation?: 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';
  label?: string;
  sum?: string;
  unit?: string;
  thresholds: Threshold[];
}

export interface Metric {
  refIds?: RefIds[];
  legends?: Legends[];
  displayText?: string;
  filling?: string;
  baseColor?: string;
  thresholds?: Threshold[];
  decimal?: number;
}

export interface LabelMapping {
  condition: string;
  value: number;
  label: string;
}

export interface Change {
  id: string | string[];
  attributes: {
    autoConfig?: boolean;
    schema?: string;
    link?: string;
    tooltip?: Tooltip[];
    label?: string;
    labelColor?: string;
    labelMapping?: LabelMapping[];
    metrics?: Metric[];
  };
}

export interface TooltipContent {
  label: string;
  metric: string;
  color: string;
  text?: string;
  dtime?: boolean;
  backColor?: string;
  textColor?: string;
}

export interface Tooltip {
  show: boolean;
  dTime?: boolean;
  text?: string;
  backColor?: string;
  textColor?: string;
}

export interface ColorDataEntry {
  id: string;
  refId: string;
  label: string;
  color: string;
  lvl: number;
  metric: number;
  filling?: string;
  unit?: string;
}

export interface PanelOptions {
  jsonData: {
    svgCode: string;
    metricsMapping: string;
    build: boolean;
  };
}

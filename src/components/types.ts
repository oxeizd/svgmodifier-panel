export interface Threshold {
  color: string;
  value: number;
  status?: 'b' | 'w' | 'c';
  operator?: '=' | '>' | '<' | '>=' | '!=' | '<=';
  condition?: string;
}

export interface RefIds {
  refid: string;
  filter?: string;
  sum?: string;
}

export interface Legends {
  legend: string;
  filter?: string;
  sum?: string;
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
    label?: string;
    labelColor?: string;
    labelMapping?: LabelMapping[];
    link?: string;
    tooltip?: Tooltip[];
    metrics?: Metric[];
  };
}

export interface TooltipContent {
  label: string;
  metric: number;
  color: string;
}

export interface Tooltip {
  show: boolean;
  dTime?: boolean;
  text?: string;
  backgroundColor?: string;
}

export interface PanelOptions {
  jsonData: {
    svgCode: string;
    metricsMapping: string;
    build: boolean;
  };
}

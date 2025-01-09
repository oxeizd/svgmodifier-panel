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
  baseColor?: string;
  thresholds?: Threshold[];
  decimal?: number;
}

export interface Change {
  id: string;
  attributes: {
    fillcolor?: string;
    labeltext?: string;
    labelColor?: string;
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

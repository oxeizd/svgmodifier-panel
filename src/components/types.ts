export interface Change {
  id: string | string[];
  attributes: {
    autoConfig?: boolean;
    link?: string | string[];
    tooltip?: Tooltip;
    label?: string;
    labelColor?: string;
    labelMapping?: LabelMapping[];
    metrics?: Metric | Metric[];
  };
}

export interface Tooltip {
  show: boolean;
  textAbove?: string;
  textBelow?: string;
}

export interface LabelMapping {
  condition: string;
  value: number;
  label: string;
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

interface BaseRef {
  filter?: string;
  calculation?: 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';
  label?: string;
  sum?: string;
  unit?: string;
  title?: string;
  thresholds: Threshold[];
}

export interface RefIds extends BaseRef {
  refid: string;
}

export interface Legends extends BaseRef {
  legend: string;
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
  metric: number;
  filling?: string;
  unit?: string;
  title?: string;
}

export type ExpandedItem = {
  id: string;
  schema: string;
  selector: string;
  svgElement: SVGElement;
  attributes: Change['attributes'];
  colorDataEntries: ColorDataEntry[];
  maxEntry?: ColorDataEntry;
};

export interface PanelOptions {
  jsonData: {
    svgCode: string;
    metricsMapping: string;
  };
}

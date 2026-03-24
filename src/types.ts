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
    RelativeTime: string;
    fieldsRelativeTime: string;
  };
  tooltip: {
    sort: 'none' | 'ascending' | 'descending';
    maxWidth: number;
    valuePosition: 'standard' | 'right';
    hideZeros: boolean;
  };
  notifyTooltip: {
    enable: boolean;
    firingThreshold: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface Expr {
  refId: string;
  expression: string;
}

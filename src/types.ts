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
    legacyButton: boolean;
  };
  tooltip: {
    sort: 'none' | 'ascending' | 'descending';
    maxWidth: number;
    valuePosition: 'standard' | 'right';
    hideZeros: boolean;
  };
  notifyTooltip: {
    enable: boolean;
    firingSetting: number;
  };
}

export interface Expr {
  refId: string;
  expression: string;
}

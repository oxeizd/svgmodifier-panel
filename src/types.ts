export interface PanelOptions {
  jsonData: {
    svgCode: string;
    metricsMapping: Array<{
      page: string;
      code: string;
    }>;
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
    maxHeight: number;
    valuePosition: 'standard' | 'right';
    hideZeros: boolean;
  };
  notifyTooltip: {
    enable: boolean;
    firingThreshold: number;
    offsetX: number;
    offsetY: number;
    hideInEditMode: boolean;
    excludeFilter?: string;
  };
}

export interface Expr {
  refId: string;
  expression: string;
}

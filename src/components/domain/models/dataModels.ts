export type DataFrameEntry = {
  type?: string;
  length?: number;
  dataSourceName?: string;
  values: Map<
    string,
    {
      values: string[];
      timestamps?: number[];
    }
  >;
};

export type DataFrameMap = Map<string, DataFrameEntry>;

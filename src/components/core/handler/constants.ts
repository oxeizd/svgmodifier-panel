import { Metrics, QuerySpecificSettings } from 'components/types';

export const defaultConfig = {
  filter: undefined,
  sum: undefined,
  label: undefined,
  unit: undefined,
  title: undefined,
  decimal: 2,
  filling: 'fill' as const,
  baseColor: undefined,
  calculation: 'last' as const,
  thresholdKey: undefined,
  thresholds: undefined,
  dataSourceName: undefined,
};

export const getConfig = (queryConfig: QuerySpecificSettings, metricConfig: Metrics) => {
  return Object.fromEntries(
    Object.entries(defaultConfig).map(([key, defaultValue]) => {
      const typedKey = key as keyof typeof defaultConfig;

      const fromquery = queryConfig[typedKey];
      const fromMetric = typedKey in metricConfig ? (metricConfig as Record<string, any>)[typedKey] : undefined;

      return [key, fromquery ?? fromMetric ?? defaultValue];
    })
  ) as { [K in keyof typeof defaultConfig]: (typeof defaultConfig)[K] };
};

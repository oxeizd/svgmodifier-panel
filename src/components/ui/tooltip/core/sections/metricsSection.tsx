import React from 'react';
import { useTheme2 } from '@grafana/ui';
import { PanelOptions } from 'types';
import { TooltipContent } from 'components/types';
import {
  getMetricItemStyles,
  getTitleStyles,
  getMetricContainerStyles,
  getLabelStyles,
  getValueStyles,
} from '../../styles';

interface MetricsSectionProps {
  queryData: TooltipContent['queryData'];
  options: PanelOptions['tooltip'];
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({ queryData, options }) => {
  const theme = useTheme2();

  if (!queryData) {
    return null;
  }

  return (
    <div>
      {queryData.map((metric, metricIndex) => (
        <div key={`metric-${metricIndex}`} style={getMetricItemStyles()}>
          {metric.title && <div style={getTitleStyles(theme)}>{metric.title}</div>}
          <div style={getMetricContainerStyles(options)}>
            <span style={getLabelStyles(theme, options)}>
              {metric.label}
              {options.valuePosition === 'standard' && ': '}
            </span>
            <span style={getValueStyles(theme, options, metric.color)}>{metric.metric || ''}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

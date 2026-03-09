import React from 'react';
import { useTheme2 } from '@grafana/ui';
import { TimeRange } from '@grafana/data';
import { formatTimeRange } from '../utils';
import { getTimeStyles, getDividerStyles } from '../styles';

export const TimeSection: React.FC<{ timeRange: TimeRange }> = ({ timeRange }) => {
  const theme = useTheme2();

  return (
    <>
      {/* Время всегда показываем */}
      <div style={getTimeStyles(theme)}>{formatTimeRange(timeRange)}</div>

      {/* Разделитель */}
      <div style={getDividerStyles(theme)} />
    </>
  );
};

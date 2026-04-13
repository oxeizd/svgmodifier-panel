import React from 'react';
import { useTheme2 } from '@grafana/ui';
import { TimeRange } from '@grafana/data';
import { formatTimeRange } from '../utils';
import { getTimeStyles, getDividerStyles, getCloseButtonStyle } from '../styles';

export const TimeSection: React.FC<{ timeRange: TimeRange; onClose?: () => void }> = ({ timeRange, onClose }) => {
  const theme = useTheme2();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...getTimeStyles(theme) }}>
        <span>{formatTimeRange(timeRange)}</span>
        {onClose && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={getCloseButtonStyle(theme)}
          >
            ✕
          </span>
        )}
      </div>
      <div style={getDividerStyles(theme)} />
    </>
  );
};

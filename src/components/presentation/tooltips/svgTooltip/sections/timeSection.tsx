import React from 'react';
import { useTheme2 } from '@grafana/ui';
import { TimeRange } from '@grafana/data';
import { formatTimeRange } from '../utils';
import { getTimeStyles, getDividerStyles, getCloseButtonStyle } from '../styles';

export const TimeSection: React.FC<{ timeRange: TimeRange; onClose?: () => void }> = ({ timeRange, onClose }) => {
  const theme = useTheme2();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...getTimeStyles(theme) }}>
        <span>{formatTimeRange(timeRange)}</span>
        <span
          onClick={
            onClose
              ? (e) => {
                  e.stopPropagation();
                  onClose();
                }
              : undefined
          }
          style={{
            ...getCloseButtonStyle(theme),
            visibility: onClose ? 'visible' : 'hidden',
            cursor: onClose ? 'pointer' : 'default',
          }}
        >
          ✕
        </span>
      </div>
      <div style={getDividerStyles(theme)} />
    </>
  );
};

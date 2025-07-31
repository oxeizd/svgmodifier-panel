import ReactDOM from 'react-dom';
import { useTheme2 } from '@grafana/ui';
import { TooltipContent } from './types';
import React, { useLayoutEffect, useRef, useState } from 'react';

export const Tooltip: React.FC<{
  visible: boolean;
  x: number;
  y: number;
  content: TooltipContent[];
}> = ({ visible, x, y, content }) => {
  const [adjustedCoords, setAdjustedCoords] = useState({ x, y });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const theme = useTheme2();

  useLayoutEffect(() => {
    if (visible && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();

      let newX = x;
      let newY = y;

      if (newX + rect.width > window.innerWidth) {
        newX = window.innerWidth - rect.width - 10;
      }
      if (newX < 0) {
        newX = 10;
      }

      if (newY + rect.height > window.innerHeight) {
        newY = window.innerHeight - rect.height - 10;
      }
      if (newY < 0) {
        newY = 10;
      }

      setAdjustedCoords({ x: newX, y: newY });
    }
  }, [visible, x, y]);

  if (!visible) {
    return null;
  }

  const currentDateTime = new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());

  const textAbove = content.filter((item) => item.textAbove);
  const textBelow = content.filter((item) => item.textBelow);

  // Используем Set для уникальных значений
  const uniqueTextAbove: string[] = Array.from(
    new Set(
      textAbove.reduce<string[]>((acc, item) => {
        if (item.textAbove) {
          const processedText = item.textAbove.replace(/\\n/g, '\n').split('\n');
          acc.push(...processedText);
        }
        return acc;
      }, [])
    )
  );

  const uniqueTextBelow: string[] = Array.from(
    new Set(
      textBelow.reduce<string[]>((acc, item) => {
        if (item.textBelow) {
          const processedText = item.textBelow.replace(/\\n/g, '\n').split('\n');
          acc.push(...processedText);
        }
        return acc;
      }, [])
    )
  );

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: adjustedCoords.x,
    top: adjustedCoords.y,
    backgroundColor: theme.colors.background.primary,
    padding: '12px',
    borderRadius: '3px',
    pointerEvents: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    maxWidth: '500px',
    overflow: 'hidden',
    wordWrap: 'break-word',
    border: `1px solid ${theme.colors.border.weak}`,
    whiteSpace: 'normal',
  };

  return ReactDOM.createPortal(
    <div ref={tooltipRef} style={tooltipStyle}>
      <div style={{ color: '#A0A0A0', fontSize: '12px', marginBottom: '8px' }}>{currentDateTime}</div>

      {uniqueTextAbove.length > 0 && (
        <div style={{ marginBottom: '4px' }}>
          {uniqueTextAbove.map((line, index) => (
            <div
              key={`text-above-${index}`}
              style={{ color: `${theme.colors.text.primary}`, fontSize: '14px', fontWeight: '600' }}
            >
              {line}
            </div>
          ))}
        </div>
      )}

      {content.map((item, index) => (
        <div key={`metric-${index}`} style={{ marginBottom: '4px' }}>
          {item.title && <div style={{ color: '#A0A0A0', fontWeight: '300', marginBottom: '2px' }}>{item.title}</div>}
          <span style={{ color: `${theme.colors.text.primary}`, fontWeight: '500' }}>{item.label}: </span>
          <span style={{ color: item.color || `${theme.colors.text.primary}`, fontWeight: '600' }}>{item.metric}</span>
        </div>
      ))}

      {uniqueTextBelow.length > 0 && (
        <div style={{ marginTop: '4px' }}>
          {uniqueTextBelow.map((line, index) => (
            <div key={`text-below-${index}`} style={{ color: `${theme.colors.text.primary}`, fontSize: '12px' }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
};

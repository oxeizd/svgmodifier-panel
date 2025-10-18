import ReactDOM from 'react-dom';
import { useTheme2 } from '@grafana/ui';
import { TooltipContent } from './types';
import React, { useLayoutEffect, useRef, useState, useCallback, useEffect } from 'react';

interface TooltipProps {
  containerRef: React.RefObject<HTMLDivElement>;
  tooltipData: TooltipContent[];
}

export const Tooltip: React.FC<TooltipProps> = ({ containerRef, tooltipData }) => {
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: [] as TooltipContent[],
  });

  const [adjustedCoords, setAdjustedCoords] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const theme = useTheme2();

  const tooltipDataRef = useRef<TooltipContent[]>([]);
  tooltipDataRef.current = tooltipData;

  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      const targetElement = e.target as Element | null;
      if (!targetElement) {
        return;
      }

      let currentElement: Element | null = targetElement;
      while (currentElement && currentElement !== containerRef.current) {
        if (currentElement.id) {
          const currentId = currentElement.id;
          const hasTooltipData = tooltipDataRef.current.some((td) => td.id === currentId);

          if (hasTooltipData) {
            const relatedMetrics = tooltipDataRef.current.filter((td) => td.id === currentId);
            setTooltip({
              visible: true,
              x: e.clientX + 10,
              y: e.clientY,
              content: relatedMetrics,
            });
            return;
          }
        }
        currentElement = currentElement.parentElement;
      }

      setTooltip((prev) => ({ ...prev, visible: false }));
    },
    [containerRef]
  );

  const handleMouseOut = useCallback(
    (e: MouseEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;

      if (!containerRef.current?.contains(relatedTarget)) {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    },
    [containerRef]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener('mouseover', handleMouseOver as EventListener);
    container.addEventListener('mouseout', handleMouseOut as EventListener);

    return () => {
      container.removeEventListener('mouseover', handleMouseOver as EventListener);
      container.removeEventListener('mouseout', handleMouseOut as EventListener);
    };
  }, [containerRef, handleMouseOver, handleMouseOut]);

  useLayoutEffect(() => {
    if (tooltip.visible && tooltipRef.current) {
      const tooltipElement = tooltipRef.current;
      const rect = tooltipElement.getBoundingClientRect();

      let newX = tooltip.x;
      let newY = tooltip.y;

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
  }, [tooltip.visible, tooltip.x, tooltip.y]);

  function getUniqueLinesByKey(key: 'textAbove' | 'textBelow') {
    return Array.from(
      new Set(
        tooltip.content.reduce<string[]>((acc, item) => {
          const value = item[key];
          if (value) {
            acc.push(...value.replace(/\\n/g, '\n').split('\n'));
          }
          return acc;
        }, [])
      )
    );
  }

  if (!tooltip.visible) {
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

  const uniqueTextAbove = getUniqueLinesByKey('textAbove');
  const uniqueTextBelow = getUniqueLinesByKey('textBelow');

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

      {tooltip.content.map((item, index) => (
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

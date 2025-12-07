import ReactDOM from 'react-dom';
import { useTheme2 } from '@grafana/ui';
import { TimeRange } from '@grafana/data';
import { TooltipContent, PanelOptions } from '../types';
import React, { useLayoutEffect, useRef, useState, useCallback, useEffect } from 'react';

interface TooltipProps {
  containerRef: React.RefObject<HTMLDivElement>;
  tooltipData: TooltipContent[];
  options: PanelOptions['tooltip'];
  timeRange: TimeRange;
}

export const Tooltip: React.FC<TooltipProps> = ({ containerRef, tooltipData, options, timeRange }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipDataRef = useRef<TooltipContent[]>([]);
  const [adjustedCoords, setAdjustedCoords] = useState({ x: 0, y: 0 });
  const isMounted = useRef(true);

  const theme = useTheme2();

  tooltipDataRef.current = tooltipData;

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: [] as TooltipContent[],
  });

  const formatTimeRange = (timeRange: TimeRange): string => {
    const to = new Date(timeRange.to.valueOf());

    const formatTime = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    return `${formatTime(to)}`;
  };

  const processTooltipContent = useCallback(
    (content: TooltipContent[]): TooltipContent[] => {
      let processed = [...content];

      if (options.hideZeros) {
        processed = processed.filter((item) => {
          const numericValue = parseFloat(item.metric);
          return !isNaN(numericValue) && numericValue !== 0;
        });
      }

      // Сортировка
      if (options.sort !== 'none') {
        processed.sort((a, b) => {
          const aValue = parseFloat(a.metric);
          const bValue = parseFloat(b.metric);

          if (isNaN(aValue) || isNaN(bValue)) {
            return 0;
          }

          if (options.sort === 'ascending') {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        });
      }

      return processed;
    },
    [options.hideZeros, options.sort]
  );

  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      if (!isMounted.current) {
        return;
      }

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
            const processedMetrics = processTooltipContent(relatedMetrics);

            if (isMounted.current && processedMetrics.length > 0) {
              setTooltip({
                visible: true,
                x: e.clientX + 10,
                y: e.clientY,
                content: processedMetrics,
              });
            }
            return;
          }
        }
        currentElement = currentElement.parentElement;
      }

      if (isMounted.current) {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    },
    [containerRef, processTooltipContent]
  );

  const handleMouseOut = useCallback(
    (e: MouseEvent) => {
      if (!isMounted.current) {
        return;
      }

      const relatedTarget = e.relatedTarget as Node | null;
      if (!containerRef.current?.contains(relatedTarget)) {
        if (isMounted.current) {
          setTooltip((prev) => ({ ...prev, visible: false }));
        }
      }
    },
    [containerRef]
  );

  useEffect(() => {
    isMounted.current = true;

    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener('mouseover', handleMouseOver as EventListener);
    container.addEventListener('mouseout', handleMouseOut as EventListener);

    return () => {
      isMounted.current = false;
      container.removeEventListener('mouseover', handleMouseOver as EventListener);
      container.removeEventListener('mouseout', handleMouseOut as EventListener);
    };
  }, [containerRef, handleMouseOver, handleMouseOut]);

  useLayoutEffect(() => {
    if (!tooltip.visible || !tooltipRef.current) {
      return;
    }

    const tooltipElement = tooltipRef.current;
    const rect = tooltipElement.getBoundingClientRect();

    let newX = tooltip.x;
    let newY = tooltip.y;

    if (newX + rect.width > window.innerWidth) {
      newX = tooltip.x - rect.width - 10;
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

    if (isMounted.current) {
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

  useEffect(() => {
    return () => {
      isMounted.current = false;
      tooltipDataRef.current = [];
    };
  }, []);

  if (!tooltip.visible || tooltip.content.length === 0) {
    return null;
  }

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: adjustedCoords.x,
    top: adjustedCoords.y,
    backgroundColor: theme.colors.background.secondary,
    padding: '12px',
    borderRadius: '5px',
    pointerEvents: 'none',
    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    maxWidth: `${options.maxWidth}px` || '500px',
    overflow: 'hidden',
    wordWrap: 'break-word',
    border: `1px solid ${theme.colors.border.weak}`,
    whiteSpace: 'normal',
    fontFamily: theme.typography.fontFamily,
  };

  const uniqueTextAbove = getUniqueLinesByKey('textAbove');
  const uniqueTextBelow = getUniqueLinesByKey('textBelow');

  return ReactDOM.createPortal(
    <div ref={tooltipRef} style={tooltipStyle}>
      <div
        style={{
          color: theme.colors.text.primary,
          fontSize: '12px',
          marginBottom: '8px',
        }}
      >
        {formatTimeRange(timeRange)}
      </div>

      <div
        style={{
          borderBottom: `1px solid ${theme.colors.border.weak}`,
          margin: '0 -12px 8px -12px',
        }}
      />

      {uniqueTextAbove.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          {uniqueTextAbove.map((line, index) => (
            <div
              key={`text-above-${index}`}
              style={{
                color: theme.colors.text.primary,
                fontSize: '13px',
                lineHeight: '1.4',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      )}

      {tooltip.content.map((item, index) => (
        <div
          key={`metric-${index}`}
          style={{
            marginBottom: '2px',
            lineHeight: '1.4',
          }}
        >
          {item.title && (
            <div
              style={{
                color: theme.colors.text.secondary,
                marginBottom: '3px',
                fontSize: '12px',
              }}
            >
              {item.title}
            </div>
          )}

          <div
            style={{
              display: options.valuePosition === 'right' ? 'flex' : 'block',
              justifyContent: options.valuePosition === 'right' ? 'space-between' : 'flex-start',
              alignItems: options.valuePosition === 'right' ? 'center' : 'flex-start',
            }}
          >
            <span
              style={{
                color: theme.colors.text.primary,
                marginRight: options.valuePosition === 'right' ? '8px' : '4px',
                fontSize: '13px',
              }}
            >
              {item.label}
              {options.valuePosition === 'standard' && ': '}
            </span>
            <span
              style={{
                color: item.color || theme.colors.text.primary,
                textAlign: options.valuePosition === 'right' ? 'right' : 'left',
                fontSize: '13px',
              }}
            >
              {item.metric}
            </span>
          </div>
        </div>
      ))}

      {uniqueTextBelow.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {uniqueTextBelow.map((line, index) => (
            <div
              key={`text-below-${index}`}
              style={{
                color: theme.colors.text.primary,
                fontSize: '12px',
                lineHeight: '1.4',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
};

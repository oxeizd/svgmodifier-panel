import ReactDOM from 'react-dom';
import { useTheme2 } from '@grafana/ui';
import { TimeRange } from '@grafana/data';
import { TooltipContent, PanelOptions } from '../types';
import React, { useLayoutEffect, useRef, useState, useCallback, useEffect, useMemo } from 'react';

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
  const rafIdRef = useRef<number | null>(null); // Для requestAnimationFrame

  const theme = useTheme2();

  // ✅ Используем useEffect для обновления ref, а не на каждом рендере
  useEffect(() => {
    tooltipDataRef.current = tooltipData;
  }, [tooltipData]);

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: [] as TooltipContent[],
  });

  // ✅ Мемоизируем форматирование времени
  const formattedTime = useMemo(() => {
    const formatTimeRange = (timeRange: TimeRange): string => {
      const to = new Date(timeRange.to.valueOf());
      const year = to.getFullYear();
      const month = String(to.getMonth() + 1).padStart(2, '0');
      const day = String(to.getDate()).padStart(2, '0');
      const hours = String(to.getHours()).padStart(2, '0');
      const minutes = String(to.getMinutes()).padStart(2, '0');
      const seconds = String(to.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    return formatTimeRange(timeRange);
  }, [timeRange]);

  // ✅ Мемоизируем обработку контента
  const processTooltipContent = useCallback(
    (content: TooltipContent[]): TooltipContent[] => {
      let processed = [...content];

      if (options.hideZeros) {
        processed = processed.filter((item) => {
          const numericValue = parseFloat(item.metric);
          return !isNaN(numericValue) && numericValue !== 0;
        });
      }

      if (options.sort !== 'none') {
        processed.sort((a, b) => {
          const aValue = parseFloat(a.metric);
          const bValue = parseFloat(b.metric);

          if (isNaN(aValue) || isNaN(bValue)) {
            return 0;
          }

          return options.sort === 'ascending' ? aValue - bValue : bValue - aValue;
        });
      }

      return processed;
    },
    [options.hideZeros, options.sort]
  );

  // ✅ Используем useCallback с правильными зависимостями
  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      if (!isMounted.current) {
        return;
      }

      const targetElement = e.target as Element | null;
      if (!targetElement) {
        return;
      }

      // ✅ Оптимизированный поиск элемента с id
      let currentElement: Element | null = targetElement;
      const container = containerRef.current;

      while (currentElement && currentElement !== container) {
        if (currentElement.id) {
          const currentId = currentElement.id;

          // ✅ Быстрая проверка через Set для производительности
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

  // ✅ Основной эффект для event listeners
  useEffect(() => {
    isMounted.current = true;

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleMouseOverBound = handleMouseOver as EventListener;
    const handleMouseOutBound = handleMouseOut as EventListener;

    container.addEventListener('mouseover', handleMouseOverBound);
    container.addEventListener('mouseout', handleMouseOutBound);

    // ✅ Полная очистка
    return () => {
      isMounted.current = false;

      // Очищаем ref'ы
      tooltipDataRef.current = [];

      // Удаляем event listeners
      if (container) {
        container.removeEventListener('mouseover', handleMouseOverBound);
        container.removeEventListener('mouseout', handleMouseOutBound);
      }

      // Отменяем pending animation frame
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Скрываем tooltip если виден
      setTooltip((prev) => ({ ...prev, visible: false }));
    };
  }, [containerRef, handleMouseOver, handleMouseOut]);

  // ✅ Оптимизированный useLayoutEffect с requestAnimationFrame
  useLayoutEffect(() => {
    if (!tooltip.visible || !tooltipRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!tooltipRef.current || !isMounted.current) {
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
    };

    // Используем requestAnimationFrame для плавности
    rafIdRef.current = requestAnimationFrame(updatePosition);

    // ✅ Очистка
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [tooltip.visible, tooltip.x, tooltip.y]);

  // ✅ Мемоизируем уникальные строки
  const [uniqueTextAbove, uniqueTextBelow] = useMemo(() => {
    if (!tooltip.visible || tooltip.content.length === 0) {
      return [[], []];
    }

    const getUniqueLinesByKey = (key: 'textAbove' | 'textBelow') => {
      const lines = new Set<string>();

      for (const item of tooltip.content) {
        const value = item[key];
        if (value) {
          const splitLines = value.replace(/\\n/g, '\n').split('\n');
          for (const line of splitLines) {
            lines.add(line);
          }
        }
      }

      return Array.from(lines);
    };

    return [getUniqueLinesByKey('textAbove'), getUniqueLinesByKey('textBelow')];
  }, [tooltip.visible, tooltip.content]);

  // ✅ Мемоизируем стили tooltip
  const tooltipStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'fixed',
      left: adjustedCoords.x,
      top: adjustedCoords.y,
      backgroundColor: theme.colors.background.secondary,
      padding: '12px',
      borderRadius: '2px',
      pointerEvents: 'none',
      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      maxWidth: `${options.maxWidth}px` || '500px',
      overflow: 'hidden',
      wordWrap: 'break-word',
      border: `1px solid ${theme.colors.border.weak}`,
      whiteSpace: 'normal',
      fontFamily: theme.typography.fontFamily,
      opacity: tooltip.visible ? 1 : 0, // Плавное исчезновение
      transition: 'opacity 0.1s ease',
    }),
    [adjustedCoords, theme, options.maxWidth, tooltip.visible]
  );

  if (!tooltip.visible || tooltip.content.length === 0) {
    return null;
  }

  return ReactDOM.createPortal(
    <div ref={tooltipRef} style={tooltipStyle}>
      <div
        style={{
          color: theme.colors.text.primary,
          fontSize: '12px',
          marginBottom: '8px',
        }}
      >
        {formattedTime}
      </div>

      <div
        style={{
          borderBottom: `1px solid ${theme.colors.border.weak}`,
          margin: '0 -12px 8px -12px',
        }}
      />

      {uniqueTextAbove.length > 0 && (
        <div style={{ marginBottom: '6px' }}>
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
          key={`metric-${item.id}-${index}`} // ✅ Улучшенный key
          style={{
            marginBottom: '1px',
            lineHeight: '1.4',
          }}
        >
          {item.title && (
            <div
              style={{
                color: theme.colors.text.secondary,
                marginBottom: '2px',
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
        <div style={{ marginTop: '4px' }}>
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

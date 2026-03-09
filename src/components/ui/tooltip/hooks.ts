import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TooltipState, defaultTooltipState } from './constants';
import { TooltipContent } from 'components/types';
import { processTooltipContent } from './utils';
import { PanelOptions } from 'types';

export const useTooltipLogic = (
  tooltipData: TooltipContent[],
  containerRef: React.RefObject<HTMLDivElement>,
  options: PanelOptions['tooltip']
) => {
  const isMounted = useRef(true);
  const tooltipDataRef = useRef<TooltipContent[]>([]);
  const [tooltipState, setTooltipState] = useState<TooltipState>(defaultTooltipState);
  const [adjustedCoords, setAdjustedCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  tooltipDataRef.current = tooltipData;

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
            const currentMetric = tooltipDataRef.current.find((td) => td.id === currentId);
            const tooltipData = processTooltipContent(currentMetric, options);

            if (isMounted.current && tooltipData) {
              setTooltipState({
                id: currentId,
                content: tooltipData,
                visible: true,
                x: e.clientX + 10,
                y: e.clientY,
              });
            }
            return;
          }
        }
        currentElement = currentElement.parentElement;
      }

      if (isMounted.current) {
        setTooltipState((prev) => ({ ...prev, visible: false }));
      }
    },
    [containerRef, options]
  );

  const handleMouseOut = useCallback(
    (e: MouseEvent) => {
      if (!isMounted.current) {
        return;
      }

      const relatedTarget = e.relatedTarget as Node | null;
      if (!containerRef.current?.contains(relatedTarget)) {
        if (isMounted.current) {
          setTooltipState((prev) => ({ ...prev, visible: false }));
        }
      }
    },
    [containerRef]
  );

  const adjustTooltipPosition = useCallback((tooltipElement: HTMLDivElement | null, x: number, y: number) => {
    if (!tooltipElement) {
      return { x, y };
    }

    const rect = tooltipElement.getBoundingClientRect();
    let newX = x;
    let newY = y;

    if (newX + rect.width > window.innerWidth) {
      newX = x - rect.width - 10;
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

    return { x: newX, y: newY };
  }, []);

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
    if (!tooltipState.visible) {
      return;
    }

    const tooltipElement = document.querySelector('[data-tooltip]') as HTMLDivElement;
    const newCoords = adjustTooltipPosition(tooltipElement, tooltipState.x, tooltipState.y);

    if (isMounted.current) {
      setAdjustedCoords(newCoords);
    }
  }, [tooltipState.visible, tooltipState.x, tooltipState.y, adjustTooltipPosition]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      tooltipDataRef.current = [];
    };
  }, []);

  return {
    tooltipState,
    adjustedCoords,
    setTooltipState,
  };
};

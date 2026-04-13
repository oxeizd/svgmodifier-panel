import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TooltipContent } from 'components/types';
import { processTooltipContent } from './utils';
import { PanelOptions } from 'types';

interface PinnedTooltip {
  id: string;
  content: TooltipContent;
  x: number;
  y: number;
}

export const useTooltipLogic = (
  tooltipData: TooltipContent[],
  containerRef: React.RefObject<HTMLDivElement>,
  options: PanelOptions['tooltip']
) => {
  const isMounted = useRef(true);
  const tooltipDataRef = useRef<TooltipContent[]>([]);
  const [hoverTooltip, setHoverTooltip] = useState<{
    id: string;
    content: TooltipContent;
    x: number;
    y: number;
  } | null>(null);
  const [pinnedTooltips, setPinnedTooltips] = useState<PinnedTooltip[]>([]);
  const [adjustedCoords, setAdjustedCoords] = useState<Record<string, { x: number; y: number }>>({});

  tooltipDataRef.current = tooltipData;

  const hideHover = useCallback(() => {
    if (!isMounted.current) {
      return;
    }
    setHoverTooltip(null);
  }, []);

  const pin = useCallback((id: string, content: TooltipContent, x: number, y: number) => {
    if (!isMounted.current) {
      return;
    }
    setPinnedTooltips((prev) => {
      if (prev.some((p) => p.id === id)) {
        return prev;
      }
      return [...prev, { id, content, x: x + 10, y }];
    });
  }, []);

  const unpin = useCallback((id: string) => {
    if (!isMounted.current) {
      return;
    }
    setPinnedTooltips((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const unpinAll = useCallback(() => {
    if (!isMounted.current) {
      return;
    }
    setPinnedTooltips([]);
  }, []);

  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      if (!isMounted.current) {
        return;
      }
      const target = e.target as Element | null;
      if (!target) {
        return;
      }

      let current: Element | null = target;
      while (current && current !== containerRef.current) {
        const id = current.id;
        if (id) {
          if (pinnedTooltips.some((p) => p.id === id)) {
            return;
          }
          const metric = tooltipDataRef.current.find((td) => td.id === id);
          if (metric) {
            const content = processTooltipContent(metric, options);
            if (content) {
              setHoverTooltip({
                id: current.id,
                content,
                x: e.clientX + 10,
                y: e.clientY,
              });
            }
            return;
          }
        }
        current = current.parentElement;
      }
      hideHover();
    },
    [containerRef, options, pinnedTooltips, hideHover]
  );

  const handleMouseOut = useCallback(
    (e: MouseEvent) => {
      if (!isMounted.current) {
        return;
      }
      const related = e.relatedTarget as Node | null;
      if (!containerRef.current?.contains(related)) {
        hideHover();
      }
    },
    [containerRef, hideHover]
  );

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) {
        return;
      }
      let current: Element | null = target;
      while (current && current !== containerRef.current) {
        const id = current.id;
        if (id) {
          const metric = tooltipDataRef.current.find((td) => td.id === id);
          if (metric) {
            e.preventDefault();
            if (pinnedTooltips.some((p) => p.id === id)) {
              hideHover();
              unpin(id);
              return;
            }
            const content = processTooltipContent(metric, options);
            if (content) {
              hideHover();
              pin(id, content, e.clientX, e.clientY);
            }
            return;
          }
        }
        current = current.parentElement;
      }
    },
    [containerRef, options, pinnedTooltips, pin, unpin, hideHover]
  );

  // Закрытие всех закреплённых тултипов по клику левой кнопкой (если клик не внутри тултипа и не внутри целевого элемента)
  const handleDocumentClick = useCallback(
    (e: MouseEvent) => {
      if (!pinnedTooltips.length) {
        return;
      }
      const target = e.target as Node | null;
      if (!target) {
        return;
      }

      // Проверяем, клик внутри любого закреплённого тултипа
      const clickedInsideTooltip = pinnedTooltips.some((p) => {
        const tooltipEl = document.querySelector(`[data-tooltip-id="${p.id}"]`);
        return tooltipEl && tooltipEl.contains(target);
      });
      if (clickedInsideTooltip) {
        return;
      }

      // Проверяем, клик на элементе, для которого есть закреплённый тултип (целевой элемент)
      let current = target as Element | null;
      let clickedOnTarget = false;
      while (current && current !== containerRef.current) {
        const id = current.id;
        if (id && pinnedTooltips.some((p) => p.id === id)) {
          clickedOnTarget = true;
          break;
        }
        current = current.parentElement;
      }
      if (clickedOnTarget) {
        return;
      }

      // Иначе закрываем все закреплённые тултипы
      unpinAll();
    },
    [pinnedTooltips, containerRef, unpinAll]
  );

  const adjustTooltipPosition = useCallback((el: HTMLDivElement | null, x: number, y: number) => {
    if (!el) {
      return { x, y };
    }
    const rect = el.getBoundingClientRect();
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

  useLayoutEffect(() => {
    if (!pinnedTooltips.length) {
      return;
    }
    const newCoords: Record<string, { x: number; y: number }> = {};
    for (const p of pinnedTooltips) {
      const el = document.querySelector(`[data-tooltip-id="${p.id}"]`) as HTMLDivElement;
      if (el) {
        newCoords[p.id] = adjustTooltipPosition(el, p.x, p.y);
      }
    }
    if (isMounted.current) {
      setAdjustedCoords(newCoords);
    }
  }, [pinnedTooltips, adjustTooltipPosition]);

  useEffect(() => {
    isMounted.current = true;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener('mouseover', handleMouseOver as EventListener);
    container.addEventListener('mouseout', handleMouseOut as EventListener);
    container.addEventListener('contextmenu', handleContextMenu as EventListener);
    document.addEventListener('click', handleDocumentClick as EventListener);

    return () => {
      isMounted.current = false;
      container.removeEventListener('mouseover', handleMouseOver as EventListener);
      container.removeEventListener('mouseout', handleMouseOut as EventListener);
      container.removeEventListener('contextmenu', handleContextMenu as EventListener);
      document.removeEventListener('click', handleDocumentClick as EventListener);
    };
  }, [containerRef, handleMouseOver, handleMouseOut, handleContextMenu, handleDocumentClick]);

  return {
    hoverTooltip,
    pinnedTooltips,
    adjustedCoords,
    unpin,
    unpinAll,
  };
};

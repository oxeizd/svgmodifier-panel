import { useCallback, RefObject } from 'react';
import { TooltipContent } from 'components/types';
import { PanelOptions } from 'types';
import { processTooltipContent } from '../utils/formatting';

interface UseTooltipEventsParams {
  containerRef: RefObject<HTMLDivElement>;
  tooltipDataRef: React.MutableRefObject<TooltipContent[]>;
  pinnedRef: React.MutableRefObject<any[]>; // PinnedTooltip[]
  hoverRef: React.MutableRefObject<any>; // HoverTooltip | null
  options: PanelOptions['tooltip'];
  setHover: (content: TooltipContent, x: number, y: number) => void;
  updatePosition: (x: number, y: number) => void;
  hideHover: () => void;
  pin: (elementId: string, content: TooltipContent, anchorX: number, anchorY: number) => void;
  unpin: (id: string) => void;
  getHoverTooltipElement?: () => HTMLDivElement | null;
}

export const useTooltipEvents = ({
  containerRef,
  tooltipDataRef,
  pinnedRef,
  hoverRef,
  options,
  setHover,
  updatePosition,
  hideHover,
  pin,
  unpin,
  getHoverTooltipElement,
}: UseTooltipEventsParams) => {
  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) {
        return;
      }

      let el: Element | null = target;
      while (el && el !== containerRef.current) {
        const id = el.id;
        if (id) {
          if (pinnedRef.current.some((p) => p.elementId === id)) {
            return;
          }

          const metric = tooltipDataRef.current.find((td) => td.id === id);
          if (metric) {
            const content = processTooltipContent(metric, options);
            if (content) {
              setHover(content, e.clientX, e.clientY);
            }
            return;
          }
        }
        el = el.parentElement;
      }
      hideHover();
    },
    [containerRef, tooltipDataRef, pinnedRef, options, setHover, hideHover]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (hoverRef.current) {
        updatePosition(e.clientX, e.clientY);
      }
    },
    [hoverRef, updatePosition]
  );

  const handleMouseOut = useCallback(
    (e: MouseEvent) => {
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

      let el: Element | null = target;
      while (el && el !== containerRef.current) {
        const id = el.id;
        if (id) {
          const metric = tooltipDataRef.current.find((td) => td.id === id);
          if (metric) {
            e.preventDefault();
            const existing = pinnedRef.current.find((p) => p.elementId === id);
            if (existing) {
              unpin(existing.id);
              hideHover();
              return;
            }
            const content = processTooltipContent(metric, options);
            if (content) {
              let anchorX: number, anchorY: number;

              const hoverElement = getHoverTooltipElement?.();
              if (hoverElement && hoverElement.isConnected) {
                const rect = hoverElement.getBoundingClientRect();
                anchorX = rect.left;
                anchorY = rect.top;
              } else {
                const currentHover = hoverRef.current;
                if (currentHover) {
                  anchorX = currentHover.mouseX;
                  anchorY = currentHover.mouseY;
                } else {
                  const rect = el.getBoundingClientRect();
                  anchorX = rect.left;
                  anchorY = rect.top;
                }
              }

              hideHover();
              pin(id, content, anchorX, anchorY);
            }
            return;
          }
        }
        el = el.parentElement;
      }
    },
    [containerRef, tooltipDataRef, pinnedRef, hoverRef, options, pin, unpin, hideHover, getHoverTooltipElement]
  );

  return {
    handleMouseOver,
    handleMouseMove,
    handleMouseOut,
    handleContextMenu,
  };
};

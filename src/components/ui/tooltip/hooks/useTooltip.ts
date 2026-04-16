import { useEffect, useRef } from 'react';
import { PanelOptions } from 'types';
import { TooltipContent } from 'components/types';
import { useHoverTooltip } from './useHoverTooltip';
import { usePinnedTooltips } from './usePinnedTooltips';
import { useTooltipEvents } from './useTooltipEvents';
import { useTooltipDataSync } from './useTooltipDataSync';

export const useTooltip = (
  tooltipData: TooltipContent[],
  containerRef: React.RefObject<HTMLDivElement>,
  options: PanelOptions['tooltip'],
  getHoverTooltipElement?: () => HTMLDivElement | null
) => {
  const tooltipDataRef = useRef(tooltipData);

  const hover = useHoverTooltip();
  const pinned = usePinnedTooltips();

  // Синхронизируем ref с актуальными данными
  useEffect(() => {
    tooltipDataRef.current = tooltipData;
  }, [tooltipData]);

  // Обработчики событий
  const events = useTooltipEvents({
    containerRef,
    tooltipDataRef,
    pinnedRef: pinned.pinnedRef,
    hoverRef: hover.hoverRef,
    options,
    setHover: hover.setHover,
    updatePosition: hover.updatePosition,
    hideHover: hover.hideHover,
    pin: pinned.pin,
    unpin: pinned.unpin,
    getHoverTooltipElement,
  });

  // Синхронизация данных закреплённых тултипов
  useTooltipDataSync({
    tooltipData,
    options,
    pinnedTooltips: pinned.pinnedTooltips,
    setPinnedTooltips: pinned.setPinnedTooltips,
  });

  // Подписка на события DOM
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener('mouseover', events.handleMouseOver);
    container.addEventListener('mousemove', events.handleMouseMove);
    container.addEventListener('mouseout', events.handleMouseOut);
    container.addEventListener('contextmenu', events.handleContextMenu);

    return () => {
      container.removeEventListener('mouseover', events.handleMouseOver);
      container.removeEventListener('mousemove', events.handleMouseMove);
      container.removeEventListener('mouseout', events.handleMouseOut);
      container.removeEventListener('contextmenu', events.handleContextMenu);
    };
  }, [containerRef, events]);

  return {
    hoverTooltip: hover.hoverTooltip,
    pinnedTooltips: pinned.pinnedTooltips,
    unpin: pinned.unpin,
    unpinAll: pinned.unpinAll,
    hideHover: hover.hideHover,
  };
};

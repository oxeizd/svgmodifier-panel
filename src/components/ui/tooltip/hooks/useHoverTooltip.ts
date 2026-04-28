import { useState, useCallback, useRef, useEffect } from 'react';
import { TooltipContent } from 'components/types';

interface HoverTooltip {
  content: TooltipContent;
  mouseX: number;
  mouseY: number;
}

export const useHoverTooltip = () => {
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);
  const hoverRef = useRef(hoverTooltip);

  useEffect(() => {
    hoverRef.current = hoverTooltip;
  }, [hoverTooltip]);

  const setHover = useCallback((content: TooltipContent, mouseX: number, mouseY: number) => {
    setHoverTooltip({ content, mouseX, mouseY });
  }, []);

  const updatePosition = useCallback((mouseX: number, mouseY: number) => {
    setHoverTooltip((prev) => (prev ? { ...prev, mouseX, mouseY } : null));
  }, []);

  const hideHover = useCallback(() => {
    setHoverTooltip(null);
  }, []);

  return {
    hoverTooltip,
    hoverRef,
    setHover,
    updatePosition,
    hideHover,
  };
};

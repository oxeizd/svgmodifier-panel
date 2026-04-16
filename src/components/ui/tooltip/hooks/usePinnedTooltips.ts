import { useState, useCallback, useRef, useEffect } from 'react';
import { TooltipContent } from 'components/types';

export interface PinnedTooltip {
  id: string;
  elementId: string;
  content: TooltipContent;
  anchorX: number;
  anchorY: number;
}

export const usePinnedTooltips = () => {
  const [pinnedTooltips, setPinnedTooltips] = useState<PinnedTooltip[]>([]);
  const pinnedRef = useRef(pinnedTooltips);

  useEffect(() => {
    pinnedRef.current = pinnedTooltips;
  }, [pinnedTooltips]);

  const pin = useCallback((elementId: string, content: TooltipContent, anchorX: number, anchorY: number) => {
    setPinnedTooltips((prev) => {
      if (prev.some((p) => p.elementId === elementId)) {
        return prev;
      }
      const uniqueId = Math.random().toString(36).slice(2) + Date.now();
      return [...prev, { id: uniqueId, elementId, content, anchorX, anchorY }];
    });
  }, []);

  const unpin = useCallback((uniqueId: string) => {
    setPinnedTooltips((prev) => prev.filter((p) => p.id !== uniqueId));
  }, []);

  const unpinAll = useCallback(() => {
    setPinnedTooltips([]);
  }, []);

  return {
    pinnedTooltips,
    pinnedRef,
    pin,
    unpin,
    unpinAll,
    setPinnedTooltips,
  };
};

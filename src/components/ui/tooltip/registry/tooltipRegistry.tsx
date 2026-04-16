import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

type TooltipRegistryContextType = {
  registerTooltip: (id: string, element: HTMLDivElement) => void;
  unregisterTooltip: (id: string) => void;
  getOtherTooltipRects: (currentId: string) => DOMRect[];
};

const TooltipRegistryContext = createContext<TooltipRegistryContextType | null>(null);

export const TooltipRegistryProvider = ({ children }: { children: ReactNode }) => {
  const tooltipsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerTooltip = useCallback((id: string, element: HTMLDivElement) => {
    tooltipsRef.current.set(id, element);
  }, []);

  const unregisterTooltip = useCallback((id: string) => {
    tooltipsRef.current.delete(id);
  }, []);

  const getOtherTooltipRects = useCallback((currentId: string) => {
    const rects: DOMRect[] = [];
    for (const [id, el] of tooltipsRef.current.entries()) {
      if (id !== currentId && el.isConnected) {
        rects.push(el.getBoundingClientRect());
      }
    }
    return rects;
  }, []);

  return (
    <TooltipRegistryContext.Provider value={{ registerTooltip, unregisterTooltip, getOtherTooltipRects }}>
      {children}
    </TooltipRegistryContext.Provider>
  );
};

export const useTooltipRegistry = () => {
  const ctx = useContext(TooltipRegistryContext);
  if (!ctx) {
    throw new Error('useTooltipRegistry must be used within TooltipRegistryProvider');
  }
  return ctx;
};

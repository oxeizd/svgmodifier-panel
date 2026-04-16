import React, { useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { TimeRange } from '@grafana/data';

import { PanelOptions } from 'types';
import { TooltipContent } from '../../../types';
import { useTooltip } from '../hooks';
import { FloatingTooltip } from './floatingTooltip';
import { TooltipRegistryProvider } from '../registry/tooltipRegistry';
import { createVirtualElementFromMouse } from '../utils/floating';

interface TooltipProps {
  containerRef: React.RefObject<HTMLDivElement>;
  tooltipContent: TooltipContent[];
  options: PanelOptions['tooltip'];
  timeRange: TimeRange;
}

export const Tooltip: React.FC<TooltipProps> = ({ containerRef, tooltipContent, options, timeRange }) => {
  const tooltipRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      tooltipRefs.current.set(id, el);
    } else {
      tooltipRefs.current.delete(id);
    }
  }, []);

  const { hoverTooltip, pinnedTooltips, unpin, unpinAll, hideHover } = useTooltip(
    tooltipContent,
    containerRef,
    options,
    () => tooltipRefs.current.get('hover') || null
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) {
        return;
      }
      if (window.getSelection()?.toString().length) {
        return;
      }

      for (const el of tooltipRefs.current.values()) {
        if (el.contains(target)) {
          return;
        }
      }

      let current = target as Element | null;
      while (current && current !== containerRef.current) {
        const id = current.id;
        if (id && pinnedTooltips.some((p) => p.elementId === id)) {
          return;
        }
        current = current.parentElement;
      }

      unpinAll();
      hideHover();
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [pinnedTooltips, containerRef, unpinAll, hideHover]);

  return ReactDOM.createPortal(
    <TooltipRegistryProvider>
      {hoverTooltip && (
        <FloatingTooltip
          id="hover"
          content={hoverTooltip.content}
          timeRange={timeRange}
          options={options}
          referenceElement={createVirtualElementFromMouse(hoverTooltip.mouseX, hoverTooltip.mouseY)}
          onRef={(el) => registerRef('hover', el)}
          isPinned={false}
        />
      )}
      {pinnedTooltips.map((p) => (
        <FloatingTooltip
          key={p.id}
          id={p.id}
          content={p.content}
          timeRange={timeRange}
          options={options}
          referenceElement={null}
          onClose={() => unpin(p.id)}
          onRef={(el) => registerRef(p.id, el)}
          isPinned={true}
          anchorX={p.anchorX}
          anchorY={p.anchorY}
        />
      ))}
    </TooltipRegistryProvider>,
    document.body
  );
};

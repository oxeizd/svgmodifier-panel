import React, { useCallback, useMemo } from 'react';
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/react';
import { useTheme2 } from '@grafana/ui';
import { TimeRange } from '@grafana/data';

import { PanelOptions } from 'types';
import { TooltipContent } from '../../../types';
import { useTooltipRegistry } from '../registry/tooltipRegistry';
import { createAvoidOverlapMiddleware } from '../utils/floating';
import { getTooltipContainerStyles, getContentClass } from '../styles';
import { TimeSection } from './sections/timeSection';
import { TextSection } from './sections/textSection';
import { MetricsSection } from './sections/metricsSection';
import { TableSection } from './sections/tableSection';

const hasValidContent = (content: TooltipContent): boolean => {
  return !!(
    content.queryData?.length ||
    content.queryTableData?.length ||
    content.textAbove?.length ||
    content.textBelow?.length
  );
};

interface FloatingTooltipProps {
  id: string;
  content: TooltipContent;
  timeRange: TimeRange;
  options: PanelOptions['tooltip'];
  referenceElement: { getBoundingClientRect: () => DOMRect } | null;
  onClose?: () => void;
  onRef?: (el: HTMLDivElement | null) => void;
  isPinned?: boolean;
  anchorX?: number;
  anchorY?: number;
}

export const FloatingTooltip: React.FC<FloatingTooltipProps> = ({
  id,
  content,
  timeRange,
  options,
  referenceElement,
  onClose,
  onRef,
  isPinned,
  anchorX,
  anchorY,
}) => {
  const theme = useTheme2();
  const registry = useTooltipRegistry();

  const floatingConfig = useMemo(
    () => ({
      elements: { reference: referenceElement as any },
      placement: 'right-start' as const,
      strategy: 'fixed' as const,
      middleware: [
        offset(10),
        flip({ padding: 5 }),
        shift({ padding: 5, crossAxis: true }),
        createAvoidOverlapMiddleware(registry, id, 8),
      ],
      whileElementsMounted: autoUpdate,
    }),
    [referenceElement, registry, id]
  );

  const { refs, floatingStyles } = useFloating(floatingConfig);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      refs.setFloating(node);
      if (node) {
        registry.registerTooltip(id, node);
        onRef?.(node);
      } else {
        registry.unregisterTooltip(id);
        onRef?.(null);
      }
    },
    [id, registry, onRef, refs]
  );

  const hasTable = !!content.queryTableData?.length;
  const baseStyles = getTooltipContainerStyles(theme, options, hasTable);
  const contentClassName = getContentClass;

  const textAbove = content.textAbove
    ? Array.isArray(content.textAbove)
      ? content.textAbove
      : [content.textAbove]
    : undefined;
  const textBelow = content.textBelow
    ? Array.isArray(content.textBelow)
      ? content.textBelow
      : [content.textBelow]
    : undefined;

  if (!hasValidContent(content)) {
    return null;
  }

  if (isPinned && anchorX !== undefined && anchorY !== undefined) {
    const fixedStyles: React.CSSProperties = {
      position: 'fixed',
      left: anchorX,
      top: anchorY,
      willChange: 'auto',
    };

    return (
      <div ref={setRef} style={{ ...baseStyles, ...fixedStyles }}>
        <div style={{ flexShrink: 0 }}>
          <TimeSection timeRange={timeRange} onClose={onClose} />
        </div>
        <div className={contentClassName}>
          {textAbove && <TextSection currentText={textAbove} />}
          {content.queryData?.length && <MetricsSection queryData={content.queryData} options={options} />}
          {content.queryTableData?.length && <TableSection tables={content.queryTableData} />}
          {textBelow && <TextSection currentText={textBelow} />}
        </div>
      </div>
    );
  }

  return (
    <div ref={setRef} style={{ ...baseStyles, ...floatingStyles, willChange: 'transform' }}>
      <div style={{ flexShrink: 0 }}>
        <TimeSection timeRange={timeRange} onClose={onClose} />
      </div>
      <div className={contentClassName}>
        {textAbove && <TextSection currentText={textAbove} />}
        {content.queryData?.length && <MetricsSection queryData={content.queryData} options={options} />}
        {content.queryTableData?.length && <TableSection tables={content.queryTableData} />}
        {textBelow && <TextSection currentText={textBelow} />}
      </div>
    </div>
  );
};

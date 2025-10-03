import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PanelOptions, TooltipContent, Change } from './types';
import { modifySvg } from './mainProcessor'; // Импортируем наши функции
import { PanelProps } from '@grafana/data';
import { Tooltip } from './tooltip';
import YAML from 'yaml';

const SvgPanel: React.FC<PanelProps<PanelOptions>> = React.memo(({ options, data, width, height }) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgCode = useMemo(
    () =>
      options.jsonData.svgCode ||
      '<svg width="100%" height="100%" style="background-color:rgba(240, 240, 240, 0);"></svg>',
    [options.jsonData.svgCode]
  );
  const dataFrame = data.series;

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: [] as TooltipContent[],
  });

  const [modifiedSvg, setModifiedSvg] = useState('');
  const [tooltipData, setTooltipData] = useState<TooltipContent[]>([]);

  const tooltipDataRef = useRef<TooltipContent[]>([]);
  tooltipDataRef.current = tooltipData;

  const changes: Change[] = useMemo(() => {
    try {
      const metricsMapping = YAML.parse(options.jsonData.metricsMapping);
      return metricsMapping.changes || [];
    } catch {
      return [];
    }
  }, [options.jsonData.metricsMapping]);

  const modifySvgAsync = useCallback(async () => {
    const { modifiedSvg, tooltipData } = modifySvg(svgCode, changes, dataFrame);

    setModifiedSvg(modifiedSvg);
    setTooltipData(tooltipData);
  }, [svgCode, changes, dataFrame]);

  useEffect(() => {
    modifySvgAsync();
  }, [modifySvgAsync]);

  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      const targetElement = e.target as Element | null;
      if (!targetElement) {
        return;
      }

      let currentElement: Element | null = targetElement;
      while (currentElement && currentElement !== svgContainerRef.current) {
        if (currentElement.id) {
          const currentId = currentElement.id;
          const hasTooltipData = tooltipDataRef.current.some((td) => td.id === currentId);

          if (hasTooltipData) {
            const relatedMetrics = tooltipDataRef.current.filter((td) => td.id === currentId);
            setTooltip({
              visible: true,
              x: e.clientX + 10,
              y: e.clientY,
              content: relatedMetrics,
            });
            return;
          }
        }
        currentElement = currentElement.parentElement;
      }

      if (tooltip.visible) {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    },
    [tooltip.visible]
  );

  const handleMouseOut = useCallback((e: MouseEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;

    if (!svgContainerRef.current?.contains(relatedTarget)) {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  }, []);

  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) {
      return;
    }

    container.addEventListener('mouseover', handleMouseOver as EventListener);
    container.addEventListener('mouseout', handleMouseOut as EventListener);

    return () => {
      container.removeEventListener('mouseover', handleMouseOver as EventListener);
      container.removeEventListener('mouseout', handleMouseOut as EventListener);
    };
  }, [handleMouseOver, handleMouseOut]);

  return (
    <div
      ref={svgContainerRef}
      style={{
        position: 'relative',
        height: `${height}px`,
        width: `${width}px`,
        overflow: 'hidden',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: modifiedSvg }}
        style={{
          display: 'block',
          height: `${height}px`,
          width: `${width}px`,
        }}
      />

      <Tooltip visible={tooltip.visible} x={tooltip.x} y={tooltip.y} content={tooltip.content} />
    </div>
  );
});

SvgPanel.displayName = 'SvgPanel';

export default SvgPanel;

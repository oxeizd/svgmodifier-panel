import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PanelOptions, TooltipContent, Change } from './types';
import { PanelProps } from '@grafana/data';
import { SvgModifier } from './svgModifier/MainModifer';
import { Tooltip } from './tooltip';
import YAML from 'yaml';

const SvgPanel: React.FC<PanelProps<PanelOptions>> = React.memo(({ options, data }) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgCode = useMemo(
    () =>
      options.jsonData.svgCode ||
      '<svg width="100%" height="100%" style="background-color:rgba(240, 240, 240, 0);"></svg>',
    [options.jsonData.svgCode]
  );
  const dataFrame = data.series;

  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: TooltipContent[] }>({
    visible: false,
    x: 0,
    y: 0,
    content: [],
  });

  const [modifiedSvg, setModifiedSvg] = useState<string>('');
  const [tooltipData, setTooltipData] = useState<TooltipContent[]>([]);

  const changes: Change[] = useMemo(() => {
    try {
      const metricsMapping = YAML.parse(options.jsonData.metricsMapping);
      return metricsMapping.changes || [];
    } catch {
      return [];
    }
  }, [options.jsonData.metricsMapping]);

  const modifySvgAsync = useCallback(async () => {
    const svgModifier = new SvgModifier(svgCode, changes, dataFrame);
    const { modifiedSvg, tooltipData } = await svgModifier.modify();
    setModifiedSvg(modifiedSvg);
    setTooltipData(tooltipData);
  }, [svgCode, changes, dataFrame]);

  useEffect(() => {
    modifySvgAsync();
  }, [modifySvgAsync]);

  const handleMouseOver = useCallback(
    (event: MouseEvent, tooltipInfo: { id: string }) => {
      const relatedMetrics = tooltipData.filter((item) => item.id === tooltipInfo.id);
      if (relatedMetrics.length > 0) {
        setTooltip({
          visible: true,
          x: event.clientX + 10,
          y: event.clientY,
          content: relatedMetrics,
        });
      }
    },
    [tooltipData]
  );

  const handleMouseOut = useCallback(() => {
    setTooltip((prevTooltip) => ({ ...prevTooltip, visible: false }));
  }, []);

  useEffect(() => {
    const svgElement = svgContainerRef.current?.querySelector('svg');
    if (!svgElement || tooltipData.length === 0) {
      return;
    }

    const cleanupFunctions: Array<() => void> = [];
    tooltipData.forEach((item) => {
      const element = svgElement.querySelector(`g#${item.id}`);
      if (element) {
        const mouseOverHandler = (e: MouseEvent) => handleMouseOver(e, { id: item.id });
        const mouseOutHandler = handleMouseOut;

        element.addEventListener('mouseover', mouseOverHandler as EventListener);
        element.addEventListener('mouseout', mouseOutHandler);

        cleanupFunctions.push(() => {
          element.removeEventListener('mouseover', mouseOverHandler as EventListener);
          element.removeEventListener('mouseout', mouseOutHandler);
        });
      }
    });

    return () => cleanupFunctions.forEach((cleanup) => cleanup());
  }, [tooltipData, handleMouseOut, handleMouseOver]);

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        width: '100%',
        border: 'none',
        boxShadow: 'none',
      }}
      ref={svgContainerRef}
    >
      <div
        dangerouslySetInnerHTML={{ __html: modifiedSvg }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <Tooltip visible={tooltip.visible} x={tooltip.x} y={tooltip.y} content={tooltip.content} />
    </div>
  );
});

SvgPanel.displayName = 'SvgPanel';

export default SvgPanel;

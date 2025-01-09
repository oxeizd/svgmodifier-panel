import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PanelOptions, TooltipContent, Change } from './types';
import { PanelProps } from '@grafana/data';
import { SvgModifier } from './modifySvg';
import { Tooltip } from './tooltip';
import YAML from 'yaml';

interface Props extends PanelProps<PanelOptions> {}

const SvgPanel: React.FC<Props> = ({ options, data }) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgCode =
    options.jsonData.svgCode ||
    '<svg width="100%" height="100%" style="background-color:rgba(240, 240, 240, 0);"></svg>';
  const dataFrame = data.series;

  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: TooltipContent[] }>({
    visible: false,
    x: 0,
    y: 0,
    content: [],
  });

  const [modifiedSvg, setModifiedSvg] = useState<string>('');
  const [tooltipData, setTooltipData] = useState<
    Array<{ id: string; label: string; color: string; metric: number | string }>
  >([]);

  const changes: Change[] = useMemo(() => {
    try {
      const metricsMapping = YAML.parse(options.jsonData.metricsMapping);
      return metricsMapping.changes || [];
    } catch {
      return [];
    }
  }, [options.jsonData.metricsMapping]);

  useEffect(() => {
    const svgModifier = new SvgModifier(svgCode, changes, dataFrame);
    const { modifiedSvg, tooltipData } = svgModifier.modify();
    setModifiedSvg(modifiedSvg);
    setTooltipData(tooltipData);
  }, [dataFrame, changes, svgCode]);

  const handleMouseOver = useCallback(
    (event: MouseEvent, tooltipInfo: { id: string }) => {
      const tooltipX = event.clientX + 10;
      const tooltipY = event.clientY;

      const relatedMetrics = tooltipData.filter((item) => item.id === tooltipInfo.id);

      if (relatedMetrics.length > 0) {
        setTooltip({
          visible: true,
          x: tooltipX,
          y: tooltipY,
          content: relatedMetrics.map((metric) => ({
            label: metric.label,
            metric: typeof metric.metric === 'string' ? parseFloat(metric.metric) : metric.metric,
            color: metric.color,
          })),
        });
      }
    },
    [tooltipData]
  );

  const handleMouseOut = useCallback(() => {
    setTooltip({ ...tooltip, visible: false });
  }, [tooltip]);

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

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
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
      {tooltip.visible && <Tooltip visible={tooltip.visible} x={tooltip.x} y={tooltip.y} content={tooltip.content} />}
    </div>
  );
};

export default SvgPanel;

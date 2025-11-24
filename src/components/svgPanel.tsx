import React, { useRef, useState, useEffect } from 'react';
import { PanelOptions, TooltipContent, Change } from './types';
import { extractValues } from './dataExtractor';
import { svgModifier } from './mainProcessor';
import { PanelProps } from '@grafana/data';
import { Tooltip } from './tooltip';
import YAML from 'yaml';

interface Props extends PanelProps<PanelOptions> {}

const SvgPanel: React.FC<Props> = ({ options, data, width, height, timeRange, replaceVariables }) => {
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [svg, setSvg] = useState<string>('');
  const [tooltip, setTooltip] = useState<TooltipContent[]>([]);

  const jsonData = options.jsonData;
  const svgCode = jsonData.svgCode;
  const metricsMapping = jsonData.metricsMapping;
  const svgAspectRatio = jsonData.svgAspectRatio;
  const customRelativeTime = jsonData.customRelativeTime;
  const fieldsCustomRelativeTime = jsonData.fieldsCustomRelativeTime;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const parseMetricsChanges = (): Change[] => {
      try {
        const substituted = replaceVariables ? replaceVariables(metricsMapping) : metricsMapping;
        const parsed = YAML.parse(substituted);
        return parsed?.changes ?? [];
      } catch {
        return [];
      }
    };

    const buildExtractedValues = () =>
      extractValues(data.series, customRelativeTime, fieldsCustomRelativeTime, timeRange);

    const updateSvgAndTooltips = async () => {
      const cfg = parseMetricsChanges();
      const extracted = buildExtractedValues();
      try {
        const { modSVG, tooltipData } = await svgModifier(svgCode, cfg, extracted, svgAspectRatio);

        if (!mountedRef.current) {
          return;
        }

        setSvg(modSVG);
        setTooltip(tooltipData);
      } catch {
        if (!mountedRef.current) {
          return;
        }
        setSvg('');
        setTooltip([]);
      }
    };

    updateSvgAndTooltips();
  }, [
    svgCode,
    metricsMapping,
    replaceVariables,
    data.series,
    customRelativeTime,
    fieldsCustomRelativeTime,
    timeRange,
    svgAspectRatio,
  ]);

  return (
    <div
      ref={containerRef}
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
        dangerouslySetInnerHTML={{ __html: svg }}
        style={{
          display: 'block',
          height: `${height}px`,
          width: `${width}px`,
        }}
      />
      <Tooltip containerRef={containerRef} tooltipData={tooltip} />
    </div>
  );
};

export default SvgPanel;

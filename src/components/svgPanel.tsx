import React, { useRef, useState, useEffect } from 'react';
import { PanelProps } from '@grafana/data';
import { Tooltip } from './tooltip';
import { extractValues } from './dataExtractor';
import { svgModifier } from './mainProcessor';
import { parseYamlConfig } from './utils/helpers';
import { PanelOptions, TooltipContent } from './types';

interface Props extends PanelProps<PanelOptions> {}

const SvgPanel: React.FC<Props> = ({ options, data, width, height, timeRange, replaceVariables }) => {
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [svg, setSvg] = useState<string>('');
  const [tooltip, setTooltip] = useState<TooltipContent[]>([]);
  const [processeChanges, setProcessedChanges] = useState<any[]>([]);
  const [configError, setConfigError] = useState<boolean>(false);

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
    if (metricsMapping) {
      try {
        const processed = parseYamlConfig(metricsMapping, replaceVariables);
        setProcessedChanges(processed);
        setConfigError(false);
      } catch (error) {
        console.error('Error parsing metrics mapping:', error);
        setProcessedChanges([]);
        setConfigError(true);
      }
    } else {
      setProcessedChanges([]);
      setConfigError(false);
    }
  }, [metricsMapping, replaceVariables]);

  useEffect(() => {
    const buildExtractedValues = () =>
      extractValues(data.series, customRelativeTime, fieldsCustomRelativeTime, timeRange);

    const updateSvgAndTooltips = async () => {
      const extracted = buildExtractedValues();

      try {
        if (configError) {
          if (!mountedRef.current) {
            return;
          }
          setSvg(svgCode);
          setTooltip([]);
          return;
        }

        const { modSVG, tooltipData } = await svgModifier(svgCode, processeChanges, extracted, svgAspectRatio);

        if (!mountedRef.current) {
          return;
        }

        setSvg(modSVG);
        setTooltip(tooltipData);
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        setSvg(svgCode);
        setTooltip([]);
      }
    };

    if (svgCode) {
      updateSvgAndTooltips();
    }
  }, [
    svgCode,
    processeChanges,
    configError,
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

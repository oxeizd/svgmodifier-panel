import React, { useRef, useState, useEffect } from 'react';
import { PanelProps } from '@grafana/data';
import { Tooltip } from './tooltip';
import { extractValues } from './dataExtractor';
import { svgModify } from './mainProcessor';
import { parseYamlConfig } from './utils/helpers';
import { PanelOptions, TooltipContent } from '../types';

interface Props extends PanelProps<PanelOptions> {}

const SvgPanel: React.FC<Props> = ({ options, data, width, height, timeRange, replaceVariables }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<string>('');
  const [tooltip, setTooltip] = useState<TooltipContent[]>([]);
  const [mappingConfig, setMappingConfig] = useState<any[]>([]);

  const { svgCode, metricsMapping, svgAspectRatio, customRelativeTime, fieldsCustomRelativeTime } = options.jsonData;

  useEffect(() => {
    if (metricsMapping) {
      const config = parseYamlConfig(metricsMapping, replaceVariables);
      if (config != null) {
        setMappingConfig(config);
      }
    } else {
      setMappingConfig([]);
    }
  }, [metricsMapping, replaceVariables]);

  useEffect(() => {
    let isMounted = true;

    const updateSvgAndTooltips = async () => {
      if (!isMounted) {
        return;
      }

      if (!mappingConfig.length) {
        if (isMounted) {
          setSvg(svgCode);
          setTooltip([]);
        }
        return;
      }

      const extractedData = await extractValues(data.series, customRelativeTime, fieldsCustomRelativeTime, timeRange);

      if (!isMounted) {
        return;
      }

      const { modifiedSVG, tooltipData } = await svgModify(svgCode, mappingConfig, extractedData, svgAspectRatio);

      if (isMounted) {
        setSvg(modifiedSVG);
        setTooltip(tooltipData);
      }
    };

    if (svgCode) {
      updateSvgAndTooltips();
    }

    return () => {
      isMounted = false;
    };
  }, [svgCode, mappingConfig, data.series, customRelativeTime, fieldsCustomRelativeTime, timeRange, svgAspectRatio]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height: `${height}px`,
        width: `${width}px`,
        overflow: 'hidden',
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
      <Tooltip containerRef={containerRef} tooltipData={tooltip} options={options.tooltip} timeRange={timeRange} />
    </div>
  );
};

export default SvgPanel;

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PanelOptions, TooltipContent, Change } from './types';
import { svgModifier } from './mainProcessor';
import { PanelProps } from '@grafana/data';
import { Tooltip } from './tooltip';
import YAML from 'yaml';

const SvgPanel: React.FC<PanelProps<PanelOptions>> = React.memo(
  ({ options, data, width, height, replaceVariables }) => {
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const [modifiedSvg, setModifiedSvg] = useState('');
    const [tooltipData, setTooltipData] = useState<TooltipContent[]>([]);
    const {
      svgCode,
      metricsMapping: rawMapping,
      customRelativeTime,
      svgAspectRatio,
      fieldsCustomRelativeTime,
    } = options.jsonData;

    const metricsMapping: Change[] = useMemo(() => {
      try {
        const processed = replaceVariables ? replaceVariables(rawMapping) : rawMapping;
        const metricsMapping = YAML.parse(processed);
        return metricsMapping.changes || [];
      } catch {
        return [];
      }
    }, [rawMapping, replaceVariables]);

    const modifySvgAsync = useCallback(async () => {
      const { modifiedSvg, tooltipData } = svgModifier(
        svgCode,
        metricsMapping,
        data.series,
        svgAspectRatio,
        customRelativeTime,
        fieldsCustomRelativeTime
      );
      setModifiedSvg(modifiedSvg);
      setTooltipData(tooltipData);
    }, [svgCode, metricsMapping, data.series, svgAspectRatio, customRelativeTime, fieldsCustomRelativeTime]);

    useEffect(() => {
      modifySvgAsync();
    }, [modifySvgAsync]);

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
          dangerouslySetInnerHTML={{ __html: modifiedSvg || '' }}
          style={{
            display: 'block',
            height: `${height}px`,
            width: `${width}px`,
          }}
        />

        <Tooltip containerRef={svgContainerRef} tooltipData={tooltipData} />
      </div>
    );
  }
);

SvgPanel.displayName = 'SvgPanel';

export default SvgPanel;

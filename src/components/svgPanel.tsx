import React, { useRef, useState, useEffect, useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { Tooltip } from './tooltip';
import { extractValues } from './dataExtractor';
import { svgModify } from './mainProcessor';
import { parseYamlConfig } from './utils/helpers';
import { PanelOptions, TooltipContent } from '../types';
import { initSVG, svgToString } from './svgUpdater';
// import { getTemplateSrv } from '@grafana/runtime';

interface Props extends PanelProps<PanelOptions> {}

const SvgPanel: React.FC<Props> = ({ options, data, width, height, timeRange }) => {
  const {
    svgCode,
    metricsMapping,
    svgAspectRatio,
    customRelativeTime: RelativeTime,
    fieldsCustomRelativeTime: fieldsRelativeTime,
  } = options.jsonData;

  const isActiveRef = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [svgString, setSvgString] = useState<string>('');
  const [tooltip, setTooltip] = useState<TooltipContent[]>([]);

  const { svgDoc, mappingArray } = useMemo(() => {
    const mappingArray = parseYamlConfig(metricsMapping);
    const svgDoc = initSVG(svgCode, svgAspectRatio);
    return { svgDoc, mappingArray };
  }, [svgCode, svgAspectRatio, metricsMapping]);

  useEffect(() => {
    isActiveRef.current = true;

    if (!svgDoc) {
      setSvgString('');
      return;
    }

    if (!mappingArray) {
      setSvgString(svgToString(svgDoc));
      setTooltip([]);
      return;
    }

    const processSvg = async () => {
      const queriesData = await extractValues(data.series, RelativeTime, fieldsRelativeTime, timeRange);

      if (queriesData && isActiveRef.current && svgDoc instanceof Document) {
        const result = await svgModify(svgDoc, mappingArray, queriesData);

        if (result && isActiveRef.current) {
          setSvgString(svgToString(result.svg));
          setTooltip(result.tooltipData || []);
        }

        if (typeof queriesData.clear === 'function') {
          queriesData.clear();
        }
      }
    };

    processSvg();
    return () => {
      isActiveRef.current = false;
      setTooltip([]);
    };
  }, [svgDoc, mappingArray, data.series, RelativeTime, fieldsRelativeTime, timeRange]);

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
        dangerouslySetInnerHTML={{ __html: svgString }}
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

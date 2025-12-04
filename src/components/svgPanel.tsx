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
  const [svgString, setsvgString] = useState<string>('');
  const [tooltip, setTooltip] = useState<TooltipContent[]>([]);

  const isActiveRef = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    svgCode,
    metricsMapping,
    svgAspectRatio,
    customRelativeTime: RelativeTime,
    fieldsCustomRelativeTime: fieldsRelativeTime,
  } = options.jsonData;

  const mappingArray = useMemo(() => {
    return parseYamlConfig(metricsMapping);
  }, [metricsMapping]);

  const svgDoc = useMemo(() => {
    return initSVG(svgCode, svgAspectRatio);
  }, [svgCode, svgAspectRatio]);

  useEffect(() => {
    isActiveRef.current = true;

    if (!svgDoc) {
      setsvgString('');
      return;
    }

    const processSvg = async () => {
      if (!mappingArray) {
        setsvgString(svgToString(svgDoc));
        setTooltip([]);
        return;
      }

      const queriesData = await extractValues(data.series, RelativeTime, fieldsRelativeTime, timeRange);

      if (queriesData && isActiveRef.current) {
        const result = await svgModify(svgDoc, mappingArray, queriesData);

        if (result && isActiveRef.current) {
          setsvgString(svgToString(result.svg));
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

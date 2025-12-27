import React, { useRef, useState, useEffect, useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { Tooltip } from './tooltip/tooltip';
import { extractValues } from './dataExtractor';
import { svgModify } from './mainProcessor';
import { parseYamlConfig } from './utils/helpers';
import { initSVG, svgToString } from './svgUpdater';
import { PanelOptions, TooltipContent } from '../types';
// import { getTemplateSrv } from '@grafana/runtime';

interface Props extends PanelProps<PanelOptions> {}

const SvgPanel: React.FC<Props> = (props) => {
  const {
    svgCode,
    metricsMapping,
    svgAspectRatio,
    customRelativeTime: RelativeTime,
    fieldsCustomRelativeTime: fieldsRelativeTime,
  } = props.options.jsonData;

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
      const queriesData = await extractValues(props.data.series, RelativeTime, fieldsRelativeTime, props.timeRange);

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
  }, [svgDoc, mappingArray, props.data.series, RelativeTime, fieldsRelativeTime, props.timeRange]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height: `${props.height}px`,
        width: `${props.width}px`,
        overflow: 'hidden',
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: svgString }}
        style={{
          display: 'block',
          height: `${props.height}px`,
          width: `${props.width}px`,
        }}
      />
      <Tooltip
        containerRef={containerRef}
        tooltipData={tooltip}
        options={props.options.tooltip}
        timeRange={props.timeRange}
      />
    </div>
  );
};

export default SvgPanel;

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { Tooltip } from './tooltip/tooltip';
import { parseYamlConfig } from './utils/helpers';
import { initSVG, svgToString, updateSvg } from './svgUpdater';
import { DataMap, PanelOptions, TooltipContent } from '../types';
import { initializeConfig, calculateMetrics } from './mainProcessor';
import { calculateExpressions, extractFields } from './dataExtractor';
// import { getTemplateSrv } from '@grafana/runtime';

interface Props extends PanelProps<PanelOptions> {}

const SvgPanel: React.FC<Props> = (props) => {
  const { data, timeRange, height, width, options } = props;
  const {
    svgCode,
    metricsMapping,
    svgAspectRatio,
    customRelativeTime: RelativeTime,
    fieldsCustomRelativeTime: fieldsRelativeTime,
  } = options.jsonData;
  const expressions = options.transformations.expressions;

  const isActiveRef = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [svgString, setSvgString] = useState<string>('');
  const [tooltip, setTooltip] = useState<TooltipContent[]>([]);
  const [configMap, setConfigMap] = useState<Map<string, DataMap>>(new Map());

  const { svgDoc, mappingArray } = useMemo(() => {
    const mappingArray = parseYamlConfig(metricsMapping);
    const svgDoc = initSVG(svgCode, svgAspectRatio);

    return { svgDoc, mappingArray };
  }, [svgCode, svgAspectRatio, metricsMapping]);

  useEffect(() => {
    if (svgDoc && mappingArray) {
      return setConfigMap(initializeConfig(svgDoc, mappingArray));
    }

    setConfigMap(new Map());
  }, [svgDoc, mappingArray]);

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
      const queriesData = await extractFields(data.series, RelativeTime, fieldsRelativeTime, timeRange);

      if (isActiveRef.current) {
        await calculateExpressions(expressions, queriesData, timeRange);

        const result = await calculateMetrics(configMap, queriesData);

        if (result && isActiveRef.current) {
          await updateSvg(configMap);

          setSvgString(svgToString(svgDoc));
          setTooltip(result || []);
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
  }, [svgDoc, mappingArray, configMap, expressions, data.series, RelativeTime, fieldsRelativeTime, timeRange]);

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
      <Tooltip
        containerRef={containerRef}
        tooltipData={tooltip}
        options={props.options.tooltip}
        timeRange={timeRange}
      />
    </div>
  );
};

export default SvgPanel;

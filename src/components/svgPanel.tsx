import React, { useRef, useState, useEffect, useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { Tooltip } from './tooltip/tooltip';
import { parseYamlConfig } from './utils/helpers';
import { initSVG, svgToString, updateSvg } from './svgUpdater';
import { DataMap, PanelOptions, TableVizData, TooltipContent } from '../types';
import { initializeConfig, calculateMetrics } from './mainProcessor';
import { calculateExpressions, extractFields } from './dataExtractor';
import { extractFieldsV2, calculateExpressionsV2 } from './release/processors/dataExtractor';
import { calculateMetricsV2 } from './release/processors/mainProcessor';
import { TooltipV2 } from './release/tooltip/tooltip';
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
  const { expressions, legacyButton } = options.transformations;

  const isActiveRef = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [svgString, setSvgString] = useState<string>('');
  const [tooltipContent, setTooltipContent] = useState<TooltipContent[]>([]);
  const [tooltipTableContent, setTooltipTableContent] = useState<TableVizData[]>([]);
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
      setTooltipContent([]);
      return;
    }

    const processSvg = async () => {
      if (legacyButton) {
        const queriesData = await extractFields(data.series, RelativeTime, fieldsRelativeTime, timeRange);

        if (isActiveRef.current) {
          await calculateExpressions(expressions, queriesData, timeRange);

          const result = await calculateMetrics(configMap, queriesData);

          if (result && isActiveRef.current) {
            await updateSvg(configMap);

            setSvgString(svgToString(svgDoc));
            setTooltipContent(result || []);
          }

          if (typeof queriesData.clear === 'function') {
            queriesData.clear();
          }
        }
      } else {
        const queriesData = await extractFieldsV2(data.series, RelativeTime, fieldsRelativeTime, timeRange);

        if (isActiveRef.current) {
          await calculateExpressionsV2(expressions, queriesData, timeRange);

          const result = await calculateMetricsV2(configMap, queriesData);

          if (result && isActiveRef.current) {
            await updateSvg(configMap);

            setSvgString(svgToString(svgDoc));
            setTooltipContent(result.tooltip || []);
            setTooltipTableContent(result.tooltipTable || []);
          }

          if (typeof queriesData.clear === 'function') {
            queriesData.clear();
          }
        }
      }
    };

    processSvg();
    return () => {
      isActiveRef.current = false;
      setTooltipContent([]);
    };
  }, [
    svgDoc,
    mappingArray,
    configMap,
    expressions,
    data.series,
    RelativeTime,
    fieldsRelativeTime,
    timeRange,
    legacyButton,
  ]);

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
      {legacyButton ? (
        <Tooltip
          containerRef={containerRef}
          tooltipData={tooltipContent}
          options={props.options.tooltip}
          timeRange={timeRange}
        />
      ) : (
        <TooltipV2
          containerRef={containerRef}
          tooltipData={tooltipContent}
          tableData={tooltipTableContent}
          options={props.options.tooltip}
          timeRange={timeRange}
        />
      )}
    </div>
  );
};

export default SvgPanel;

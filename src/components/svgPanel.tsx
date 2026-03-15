import React, { useRef, useState, useEffect, useMemo } from 'react';
import { PanelProps } from '@grafana/data';
import { parseYamlConfig } from './core/config/utils';
import { initSVG, svgToString, updateSvg } from './core/svg/updater';
import { initializeConfig } from './core/config/configSetup';
import { extractFields, getDataSourceNames } from './core/extractor/dataExtractor';
import { getCustomTimeSettings } from './core/extractor/timeSettings';
import { calculateExpressions } from './core/handler/utils';
import { calculateMetrics } from './core/config/calculateMetrics';
import { PanelOptions } from 'types';
import { TooltipContent } from './types';
import { Tooltip } from './ui/tooltip/tooltip';
// import { NotificationTooltip } from './ui/NotifyTooltip/NotifyTooltip';

interface Props extends PanelProps<PanelOptions> {}

const SvgPanel: React.FC<Props> = (props) => {
  const { data, timeRange, height, width, options } = props;
  const { customRelativeTime: RelativeTime, fieldsCustomRelativeTime: fieldsRelativeTime } = options.jsonData;
  const { expressions } = options.transformations;
  // const { firingSetting } = options.notifyTooltip;
  const { svgCode, metricsMapping, svgAspectRatio } = options.jsonData;

  const isActiveRef = useRef(true);
  const countQueries = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [svgString, setSvgString] = useState<string>('');
  const [tooltipContent, setTooltipContent] = useState<TooltipContent[]>([]);

  const { svgDoc, mappingArray } = useMemo(() => {
    const mappingArray = parseYamlConfig(metricsMapping);
    const svgDoc = initSVG(svgCode, svgAspectRatio);

    return { svgDoc, mappingArray };
  }, [svgCode, svgAspectRatio, metricsMapping]);

  const customTimeSettings = useMemo(() => {
    return getCustomTimeSettings(RelativeTime, fieldsRelativeTime);
  }, [RelativeTime, fieldsRelativeTime]);

  const configMap = useMemo(() => {
    if (svgDoc && mappingArray) {
      return initializeConfig(svgDoc, mappingArray);
    }
    return new Map();
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
      const queriesData = await extractFields(data, customTimeSettings, timeRange);

      if (queriesData.size !== countQueries.current) {
        await getDataSourceNames(data, queriesData);
        countQueries.current = queriesData.size;
      }

      if (isActiveRef.current) {
        await calculateExpressions(expressions, queriesData, timeRange);
        const result = await calculateMetrics(configMap, queriesData);

        if (result && isActiveRef.current) {
          await updateSvg(result.operations);
          setSvgString(svgToString(svgDoc));
          setTooltipContent(result.tooltip || []);
        }

        if (typeof queriesData.clear === 'function') {
          queriesData.clear();
        }
      }
    };

    processSvg();
    return () => {
      isActiveRef.current = false;
      setTooltipContent([]);
    };
  }, [svgDoc, mappingArray, configMap, data, timeRange, customTimeSettings, expressions]);

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
        tooltipContent={tooltipContent}
        options={options.tooltip}
        timeRange={timeRange}
      />

      {/* <NotificationTooltip
        header="Влияние оказано на"
        count={5}
        dataSourceNames={undefined}
        show={true}
        targetRef={containerRef}
      /> */}
    </div>
  );
};

export default SvgPanel;

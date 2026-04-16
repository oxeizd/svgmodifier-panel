import { useState, useEffect, useMemo, useRef } from 'react';
import { PanelData, TimeRange } from '@grafana/data';

import { PanelOptions } from 'types';
import { parseYamlConfig } from '../config/parsers';
import { TooltipContent } from 'components/types';
import { calculateExpressions } from '../handler/utils';
import { initializeConfig } from '../config/configSetup';
import { calculateMetrics } from '../config/calculateMetrics';
import { getCustomTimeSettings } from '../formatters/timeSettings';
import { extractFields, getDataSourceNames } from '../extractor/dataExtractor';
import { initSVG, svgToString, updateSvg } from '../svg/updater';

export const useSvgPanel = (data: PanelData, timeRange: TimeRange, options: PanelOptions) => {
  const countQueries = useRef(0);
  const isActiveRef = useRef(false);

  const [svgString, setSvgString] = useState('');
  const [tooltipContent, setTooltipContent] = useState<TooltipContent[]>([]);
  const [dataSourceNames, setDataSourceNames] = useState<string[]>([]);

  const { svgCode, metricsMapping, svgAspectRatio, customRelativeTime, fieldsCustomRelativeTime } = options.jsonData;

  const { expressions } = options.transformations;
  const { firingThreshold } = options.notifyTooltip;

  const customTimeSettings = useMemo(
    () => getCustomTimeSettings(customRelativeTime, fieldsCustomRelativeTime),
    [customRelativeTime, fieldsCustomRelativeTime]
  );

  const { svgDoc, mappingArray } = useMemo(() => {
    const mappingArray = parseYamlConfig(metricsMapping);
    const svgDoc = initSVG(svgCode, svgAspectRatio);
    return { svgDoc, mappingArray };
  }, [svgCode, svgAspectRatio, metricsMapping]);

  const configMap = useMemo(() => {
    if (svgDoc && mappingArray) {
      return initializeConfig(svgDoc, mappingArray);
    }
    return new Map();
  }, [svgDoc, mappingArray]);

  useEffect(() => {
    isActiveRef.current = true;
    if (!svgDoc || !mappingArray) {
      setSvgString(svgDoc ? svgToString(svgDoc) : '');
      setTooltipContent([]);
      return;
    }

    const process = async () => {
      const queriesData = await extractFields(data, customTimeSettings, timeRange);

      if (queriesData.size !== countQueries.current) {
        await getDataSourceNames(data, queriesData);
        countQueries.current = queriesData.size;
      }

      if (isActiveRef.current) {
        await calculateExpressions(expressions, queriesData, timeRange);
        const result = await calculateMetrics(configMap, queriesData, firingThreshold);

        if (result && isActiveRef.current) {
          await updateSvg(result.operations);
          setSvgString(svgToString(svgDoc));
          setTooltipContent(result.tooltip || []);
          setDataSourceNames(result.dataSourceNames || []);
        }

        if (typeof queriesData.clear === 'function') {
          queriesData.clear();
        }
      }
    };
    process();
    return () => {
      isActiveRef.current = false;
      setTooltipContent([]);
    };
  }, [svgDoc, mappingArray, configMap, data, timeRange, customTimeSettings, expressions, firingThreshold]);

  return { svgString, tooltipContent, dataSourceNames };
};

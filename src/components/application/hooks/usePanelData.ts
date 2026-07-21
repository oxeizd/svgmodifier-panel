import { useState, useEffect, useRef, useMemo } from 'react';
import { PanelData, TimeRange } from '@grafana/data';
import { PanelOptions } from 'types';

import { initSVG } from 'components/infrastructure/svg/updater';
import { parseYamlConfig } from 'components/infrastructure/config/parsers';
import { initializeConfig } from 'components/infrastructure/config/configSetup';
import { calculateExpressions } from 'components/domain/utils/calculations';
import { getCustomTimeSettings } from 'components/domain/utils/timeSettings';
import { getDataSourceNames } from 'components/infrastructure/services/dataSourceService';
import { TooltipContent } from 'components/domain/models';
import { processor } from 'components/domain/services/processor';
import { extractFields } from 'components/infrastructure/data/dataExtractor';

export interface ProcessedData {
  queriesData: Map<string, any>;
  tooltipContent: TooltipContent[];
  dataSourceMap: Map<string, Set<string>>;
  gridContent: any;
  operations: any;
}

export const usePanelData = (data: PanelData, timeRange: TimeRange, options: PanelOptions) => {
  const countQueries = useRef(0);
  const isActiveRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);

  const { svgCode, metricsMapping, svgAspectRatio, customRelativeTime, fieldsCustomRelativeTime } = options.jsonData;

  const mode = options.displayMode || 'svg';
  const notifyShow = options.notifyTooltip.show;
  const notifyThreshold = options.notifyTooltip.threshold;

  const calculateOptions = useMemo(
    () => ({
      mode,
      notifySettings: {
        show: notifyShow,
        threshold: notifyThreshold,
      },
    }),
    [mode, notifyShow, notifyThreshold]
  );

  const customTimeSettings = useMemo(
    () => getCustomTimeSettings(customRelativeTime, fieldsCustomRelativeTime),
    [customRelativeTime, fieldsCustomRelativeTime]
  );

  const mappingArray = useMemo(() => parseYamlConfig(metricsMapping), [metricsMapping]);

  const svgDoc = useMemo(() => {
    if (mode === 'svg' && svgCode) {
      return initSVG(svgCode, svgAspectRatio);
    }
    return null;
  }, [mode, svgCode, svgAspectRatio]);

  const configMap = useMemo(() => {
    return initializeConfig(svgDoc, mappingArray);
  }, [svgDoc, mappingArray]);

  const transformationsExpressions = options.transformations.expressions;

  useEffect(() => {
    isActiveRef.current = true;
    setIsLoading(true);

    const process = async () => {
      try {
        const queriesData = await extractFields(data, customTimeSettings, timeRange);

        if (notifyShow && queriesData.size !== countQueries.current) {
          await getDataSourceNames(data, queriesData);
          countQueries.current = queriesData.size;
        }

        if (!isActiveRef.current) {
          return;
        }

        await calculateExpressions(transformationsExpressions, queriesData, timeRange);
        const result = await processor(configMap, queriesData, calculateOptions);

        if (result && isActiveRef.current) {
          setProcessedData({
            queriesData,
            tooltipContent: result.tooltip || [],
            dataSourceMap: result.dataSourceMap || new Map(),
            operations: result.operations,
            gridContent: result.gridContent,
          });
        }
      } finally {
        if (isActiveRef.current) {
          setIsLoading(false);
        }
      }
    };

    process();
    return () => {
      isActiveRef.current = false;
    };
  }, [data, timeRange, configMap, customTimeSettings, calculateOptions, notifyShow, transformationsExpressions]);

  return {
    processedData,
    isLoading,
    svgDoc,
    configMap,
    mappingArray,
  };
};

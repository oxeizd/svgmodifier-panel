import { displayMode } from 'types';
import { queriesFilter } from './queryFilter';
import { findBestQuery } from './queryProcessor';
import { getMetricsData } from '../../domain/services/dataHandler';
import { createSvgUpdateOperation } from 'components/infrastructure/svg/operations';
import {
  ConfigRules,
  DataMap,
  TableMetricData,
  TooltipContent,
  MetricData,
  GridContent,
  DataFrameMap,
} from 'components/domain/models';

type DsMap = Map<string, Set<string>>;

export type NotifyOptions = {
  show: boolean;
  threshold: number | undefined;
};

type CalculateOptions = {
  mode: displayMode;
  notifySettings: NotifyOptions;
};

export function processor(configMap: Map<string, DataMap>, dataFrame: DataFrameMap, options: CalculateOptions) {
  const tooltip = options.mode === 'svg' ? ([] as TooltipContent[]) : undefined;
  const operations = options.mode === 'svg' ? ([] as Array<() => void>) : undefined;
  const gridContent = options.mode === 'grid' ? ([] as GridContent[]) : undefined;
  const dataSourceMap: DsMap | undefined = options.notifySettings.show ? new Map<string, Set<string>>() : undefined;

  for (const [id, map] of configMap) {
    if (!map.additional || !Array.isArray(map.additional)) {
      continue;
    }

    let bestGloablLvl = Number.NEGATIVE_INFINITY;
    let bestGlobalMetric = Number.NEGATIVE_INFINITY;
    let bestGlobalAttributes: ConfigRules['attributes'] | undefined;
    let bestGlobalEntry: MetricData | TableMetricData | undefined;

    for (const item of map.additional) {
      const { attributes, selector, elemIndex, elemsLength } = item;

      if (!attributes?.metrics || attributes.metrics.length === 0) {
        if (bestGlobalAttributes === undefined) {
          bestGlobalAttributes = attributes;
        }
        continue;
      }

      const queriesArray = getMetricsData(attributes.metrics, dataFrame, attributes.valueMapping);
      if (!queriesArray) {
        continue;
      }

      queriesFilter(queriesArray, selector, elemIndex, elemsLength, attributes.autoConfig);

      const { dsNames, bestLvl, bestMetric, bestAttributes, bestEntry } = findBestQuery(
        id,
        queriesArray,
        attributes,
        tooltip,
        options.notifySettings
      );

      if (bestLvl > bestGloablLvl || (bestLvl === bestGloablLvl && bestMetric > bestGlobalMetric)) {
        bestGloablLvl = bestLvl;
        bestGlobalMetric = bestMetric;
        bestGlobalEntry = bestEntry;
        bestGlobalAttributes = bestAttributes;
      }

      if (dataSourceMap) {
        for (const [dsName, refId] of dsNames) {
          if (!dataSourceMap.has(dsName)) {
            dataSourceMap.set(dsName, new Set<string>());
          }
          dataSourceMap.get(dsName)!.add(refId);
        }
      }

      if (gridContent) {
        let item = gridContent.find((x) => x.id === id);
        if (!item) {
          item = {
            id,
            title: attributes.title,
            color: bestGlobalEntry?.color,
            fields: [],
            tables: [],
          };
          gridContent.push(item);
        }

        if (queriesArray.fields) {
          item.fields.push(...queriesArray.fields);
        }
        if (queriesArray.tables) {
          item.tables.push(...queriesArray.tables);
        }
      }
    }

    if (options.mode === 'svg') {
      operations!.push(createSvgUpdateOperation(map.SVGElem!, bestGlobalAttributes!, bestGlobalEntry!));
    }
  }

  return {
    operations,
    tooltip,
    gridContent,
    dataSourceMap,
  };
}

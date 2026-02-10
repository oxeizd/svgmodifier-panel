import { Change, VizData, DataMap, TooltipContent, TableVizData } from 'types';
import { applySchema, RegexCheck } from 'components/utils/helpers';
import { getMetricsDataV2 } from './queryProcessor';
import { DataFrameMap } from './dataExtractor';

export function initializeConfig(svg: Document, changes: Change[]) {
  const elementsMap = new Map<string, SVGElement>();
  const configMap: Map<string, DataMap> = new Map();

  const elements = svg.querySelectorAll<SVGElement>('[id^="cell"]');
  for (const el of elements) {
    el.id && elementsMap.set(el.id, el);
  }

  if (elementsMap.size > 0) {
    prepareConfig(changes, elementsMap, configMap);
  }

  return configMap;
}

function prepareConfig(changes: Change[], elementsMap: Map<string, SVGElement>, configMap: Map<string, DataMap>) {
  const getRuleConfig = (rule: Change) => {
    const config = rule.attributes;
    const elements = getElementsByIdOrRegex(rule.id, elementsMap);

    let elemsLength = elements.length;
    let currentIndex = 0;

    elements.forEach((el, index) => {
      const [id, schema, selector, svgElement] = el;
      let configToUse = config;
      let metrics = configToUse.metrics || undefined;

      if (Array.isArray(config.link) && config.link[index] !== undefined) {
        configToUse.link = config.link[index];
      }

      if (metrics) {
        configToUse.metrics = Array.isArray(metrics) ? metrics : [metrics];
      }

      if (schema && schema.length > 0) {
        configToUse = applySchema(configToUse, schema);
      }

      pushToMap(id, svgElement, configToUse, selector, currentIndex, elemsLength);

      if (!selector) {
        currentIndex++;
      } else {
        elemsLength = elemsLength - 1;
      }
    });
  };

  const pushToMap = (
    id: string,
    element: SVGElement,
    attributes: Change['attributes'],
    selector: string,
    elemIndex: number,
    elemsLength: number
  ) => {
    const additional = { attributes, selector, elemIndex, elemsLength };
    const item = configMap.get(id);

    if (item) {
      item.additional.push(additional);
    } else {
      configMap.set(id, { SVGElem: element, additional: [additional] });
    }
  };

  for (const rule of changes) {
    if (!rule.id || !rule.attributes) {
      continue;
    }

    getRuleConfig(rule);
  }
}

export async function calculateMetricsV2(configMap: Map<string, DataMap>, dataFrame: DataFrameMap) {
  const tooltip: TooltipContent[] = [];
  const tooltipTable: TableVizData[] = [];

  configMap.forEach((map, id) => {
    let bestEntry: VizData | undefined;
    let bestLvl = Number.NEGATIVE_INFINITY;
    let bestMetric = Number.NEGATIVE_INFINITY;
    let bestAttributes: Change['attributes'] | undefined = undefined;
    let colorTableEntry: string | undefined = undefined;

    const getMaxMetricAndTooltips = (vizData: VizData[], attributes: typeof bestAttributes) => {
      if (!vizData || !vizData.length) {
        bestAttributes = attributes;
        return;
      }

      for (const entry of vizData) {
        const currentLvl = entry.lvl ?? Number.NEGATIVE_INFINITY;
        const currentMetric = entry.metricValue ?? Number.NEGATIVE_INFINITY;

        if (currentLvl > bestLvl || (currentLvl === bestLvl && currentMetric > bestMetric)) {
          bestLvl = currentLvl;
          bestMetric = currentMetric;
          bestEntry = entry;
          bestAttributes = attributes;
        }

        if (attributes?.tooltip && attributes.tooltip.show) {
          const { textAbove, textBelow } = attributes.tooltip;

          tooltip.push({
            id: id,
            label: entry.label,
            metric: entry.displayValue || '',
            color: entry.color ?? '',
            title: entry.title,
            textAbove,
            textBelow,
          });
        }
      }
    };

    const { additional } = map;

    if (additional && Array.isArray(additional)) {
      for (const item of additional) {
        const { attributes, selector, elemIndex, elemsLength } = item;

        if (!attributes.metrics) {
          bestAttributes = attributes;
          continue;
        }

        const metricsResult = getMetricsDataV2(id, attributes.metrics, dataFrame, attributes.valueMapping);
        item.vizData = metricsFilter(metricsResult.vizData, selector, elemIndex, elemsLength, attributes.autoConfig);

        getMaxMetricAndTooltips(item.vizData, attributes);

        if (metricsResult.tableData && metricsResult.tableData.length > 0) {
          // Проходим по всем TableVizData из результата
          for (const tableDataItem of metricsResult.tableData) {
            // Находим или создаем запись для каждого id
            let existingTableVizData = tooltipTable.find((table) => table.id === tableDataItem.id);

            if (!existingTableVizData) {
              existingTableVizData = {
                id: tableDataItem.id,
                tables: [],
                textAbove: tableDataItem.textAbove || attributes.tooltip?.textAbove,
                textBelow: tableDataItem.textBelow || attributes.tooltip?.textBelow,
              };
              tooltipTable.push(existingTableVizData);
            }

            // Добавляем все таблицы из текущего элемента результата
            if (tableDataItem.tables && tableDataItem.tables.length > 0) {
              existingTableVizData.tables.push(...tableDataItem.tables);
            }
            colorTableEntry = tableDataItem.color;
          }
        }
      }
    }
    map.maxTableEntry = colorTableEntry;
    map.maxEntry = bestEntry;
    map.attributes = bestAttributes;
  });

  return { tooltip, tooltipTable };
}

function metricsFilter(
  metricsData: VizData[],
  selector: string | undefined,
  index: number,
  elemsLength: number,
  autoConfig?: boolean
): VizData[] {
  const metricsLength = metricsData.length;
  if (metricsLength === 0) {
    return metricsData;
  }

  const vizData: VizData[] = [];

  if (selector && typeof selector === 'string') {
    const expand = (s: string) => {
      const cleanStr = s.startsWith('@') ? s.substring(1) : s;
      const result = [];

      for (const p of cleanStr.split(',')) {
        const trimmed = p.trim();
        if (!trimmed) {
          continue;
        }

        const [a, b] = trimmed.split('-').map(Number);

        if (b === undefined) {
          if (!isNaN(a)) {
            result.push(a);
          }
        } else if (!isNaN(a) && !isNaN(b)) {
          const step = a <= b ? 1 : -1;
          for (let i = a; step > 0 ? i <= b : i >= b; i += step) {
            result.push(i);
          }
        }
      }

      return result;
    };

    const expanded = expand(selector);

    if (expanded.length > 0) {
      const matchingEntries = metricsData.filter((entry) => expanded.some((i) => entry.counter === i));
      vizData.push(...matchingEntries);

      return vizData;
    }
  }

  if (autoConfig === true) {
    if (metricsLength === elemsLength) {
      vizData.push(metricsData[index]);
    } else if (metricsLength < elemsLength) {
      if (index < metricsLength) {
        vizData.push(metricsData[index]);
      }
    } else {
      const lastIndex = elemsLength - 1;
      if (index < lastIndex) {
        vizData.push(metricsData[index]);
      } else {
        vizData.push(...metricsData.slice(lastIndex));
      }
    }
    return vizData;
  }

  vizData.push(...metricsData);
  return vizData;
}

function getElementsByIdOrRegex(
  id: string | string[],
  map: Map<string, SVGElement>
): Array<[string, string, string, SVGElement]> {
  const getElement = (currentId: string): Array<[string, string, string, SVGElement]> => {
    const parsed = idParser(currentId);
    if (!parsed) {
      return [];
    }
    const [id, schema, selector] = parsed;

    const checkId = id && !id.startsWith('cell-') ? `cell-${id}` : id;

    if (!RegexCheck(checkId)) {
      const element = map.get(checkId);
      return element ? [[checkId, schema, selector, element]] : [];
    }

    const regex = new RegExp(checkId);
    return Array.from(map.entries())
      .filter(([key]) => regex.test(key))
      .map(([key, element]) => [key, schema, selector, element]);
  };

  if (Array.isArray(id)) {
    return id.flatMap((currentId) => getElement(currentId));
  }

  return getElement(id);
}

function idParser(raw: string): [id: string, schema: string, selector: string] | null {
  const input = String(raw ?? '').trim();
  if (!input) {
    return null;
  }

  if (!input.includes(':')) {
    return [input, '', ''];
  }

  const items = input.split(':');
  const id = items[0];
  let schema = '';
  let selector = '';

  const isSelector = (item: string) => item?.[0] === '@' || (item?.[0] >= '0' && item?.[0] <= '9');

  if (items.length >= 2) {
    const a = items[1];
    const b = items[2];
    if (isSelector(a)) {
      selector = a;
      schema = b;
    } else if (isSelector(b)) {
      selector = b;
      schema = a;
    } else {
      schema = a;
    }
  }

  return [id, schema, selector];
}

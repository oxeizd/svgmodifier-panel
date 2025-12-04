import { getMetricsData } from './dataProcessor';
import { formatValues } from './utils/ValueTransformer';
import { applyChangesToElements } from './svgUpdater';
import { RegexCheck, applySchema, cleanupResources, getMappingMatch } from './utils/helpers';
import { Change, ColorDataEntry, DataMap, TooltipContent, ValueMapping } from '../types';

export async function svgModify(svg: Document, changes: Change[], extractedValueMap: any) {
  const tooltipData: TooltipContent[] = [];
  const configMap: Map<string, DataMap> = new Map();
  const elementsMap = new Map<string, SVGElement>();

  try {
    const elements = svg.querySelectorAll<SVGElement>('[id^="cell"]');

    if (elements.length > 0) {
      elements.forEach((element) => {
        if (element.id) {
          elementsMap.set(element.id, element);
        }
      });

      for (const rule of changes) {
        if (!rule.id && !rule.attributes) {
          continue;
        }

        processRule(rule, elementsMap, extractedValueMap, configMap);
      }

      getMaxMetric(configMap);
      applyChangesToElements(configMap);
      createTooltipData(configMap, tooltipData);
    }
    return { svg: svg, tooltipData: tooltipData };
  } finally {
    cleanupResources(elementsMap, configMap);
  }
}

function processRule(
  rule: Change,
  elementsMap: Map<string, SVGElement>,
  extractedValueMap: any,
  configMap: Map<string, DataMap>
): void {
  const config = rule.attributes;
  const elements = getElementsByIdOrRegex(rule.id, elementsMap);

  let metricsData: ColorDataEntry[] = [];
  let elemsLength = elements.length;

  if (config?.metrics) {
    metricsData = getMetricsData(config.metrics, extractedValueMap);
  }

  elements.forEach((el, index) => {
    const [id, schema, selector, svgElement] = el;

    let colordata: ColorDataEntry[] = [];
    let configUsed = config;

    if (schema && schema.length > 0) {
      const schemaConfig = applySchema(config, schema);

      if (schemaConfig?.metrics) {
        const schemaColorData = getMetricsData(schemaConfig.metrics, extractedValueMap);
        colordata = addMetrics(schemaColorData, selector, elemsLength, index, schemaConfig.autoConfig);
        configUsed = schemaConfig;
      }
    } else {
      colordata = addMetrics(metricsData, selector, elemsLength, index, config?.autoConfig);
    }

    pushToMap(configMap, id, schema, svgElement, configUsed, colordata);
  });
}

function addMetrics(
  metricsData: ColorDataEntry[],
  selector: string,
  elemsLength: number,
  index: number,
  autoConfig?: boolean
): ColorDataEntry[] {
  const metricsLength = metricsData.length;
  if (metricsLength === 0) {
    return metricsData;
  }

  const colordata: ColorDataEntry[] = [];

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
      const matchingEntries = metricsData.filter((entry) => expanded.some((i) => entry.object === i));
      colordata.push(...matchingEntries);
      return colordata;
    }
  }

  if (autoConfig === true) {
    if (metricsLength === elemsLength) {
      colordata.push(metricsData[index]);
    } else if (metricsLength < elemsLength) {
      if (index < metricsLength) {
        colordata.push(metricsData[index]);
      }
    } else {
      const lastIndex = elemsLength - 1;
      if (index < lastIndex) {
        colordata.push(metricsData[index]);
      } else {
        colordata.push(...metricsData.slice(lastIndex));
      }
    }
    return colordata;
  }

  colordata.push(...metricsData);
  return colordata;
}

function pushToMap(
  configMap: Map<string, DataMap>,
  id: string,
  schema: string,
  svgElement: SVGElement,
  settings: Change['attributes'],
  colordata: ColorDataEntry[]
) {
  if (configMap.has(id)) {
    const existingItem = configMap.get(id);
    if (existingItem) {
      existingItem.additional.push({
        schema: schema,
        attributes: settings,
        colorData: colordata,
      });
    }
  } else {
    configMap.set(id, {
      SVGElem: svgElement,
      additional: [
        {
          schema: schema,
          attributes: settings,
          colorData: colordata,
        },
      ],
    });
  }
}

function getMaxMetric(items: Map<string, DataMap>) {
  for (const [, item] of items) {
    if (!item.additional?.length) {
      item.maxEntry = undefined;
      continue;
    }

    let bestEntry: ColorDataEntry | undefined;
    let bestLvl = Number.NEGATIVE_INFINITY;
    let bestMetric = Number.NEGATIVE_INFINITY;
    let bestAttributes: Change['attributes'] | undefined = undefined;

    for (const additional of item.additional) {
      if (additional.colorData.length === 0) {
        if (additional.attributes) {
          bestAttributes = additional.attributes;
        }
        continue;
      }

      for (const entry of additional.colorData) {
        const currentLvl = entry.lvl ?? Number.NEGATIVE_INFINITY;
        const currentMetric = entry.metricValue ?? Number.NEGATIVE_INFINITY;

        if (currentLvl > bestLvl || (currentLvl === bestLvl && currentMetric > bestMetric)) {
          bestLvl = currentLvl;
          bestMetric = currentMetric;
          bestEntry = entry;
          bestAttributes = additional.attributes;
        }
      }
    }

    item.attributes = bestAttributes;
    item.maxEntry = bestEntry;
  }
}

function createTooltipData(ConfigMap: Map<string, DataMap>, tooltipData: TooltipContent[]) {
  for (const [id, item] of ConfigMap) {
    for (const additional of item.additional ?? []) {
      if (!additional.colorData || !additional.attributes?.tooltip) {
        continue;
      }

      const { textAbove, textBelow } = additional.attributes.tooltip;

      for (const entry of additional.colorData) {
        tooltipData.push({
          id,
          label: entry.label,
          color: entry.color ?? '',
          metric: formatMetricValue(entry, additional.attributes.valueMapping),
          title: entry.title ?? '',
          textAbove,
          textBelow,
        });
      }
    }
  }
}

function formatMetricValue(entry: ColorDataEntry, valueMapping?: ValueMapping[]): string {
  if (entry.metricValue == null) {
    return '';
  }

  if (valueMapping) {
    const mappedValue = getMappingMatch(valueMapping, entry.metricValue);
    if (mappedValue !== undefined) {
      return mappedValue;
    }
  } else if (entry.unit) {
    return formatValues(entry.metricValue, entry.unit);
  }

  return String(entry.metricValue);
}

function getElementsByIdOrRegex(
  id: string | string[],
  map: Map<string, SVGElement>
): Array<[string, string, string, SVGElement]> {
  const getElement = (currentId: string): Array<[string, string, string, SVGElement]> => {
    const parsed = parseId(currentId);
    if (!parsed) {
      return [];
    }
    const [id, schema, selector] = parsed;

    const checkid = id && !id.startsWith('cell-') ? `cell-${id}` : id;

    if (!RegexCheck(checkid)) {
      const element = map.get(checkid);
      return element ? [[checkid, schema, selector, element]] : [];
    }

    const regex = new RegExp(checkid);
    return Array.from(map.entries())
      .filter(([key]) => regex.test(key))
      .map(([key, element]) => [key, schema, selector, element]);
  };

  if (Array.isArray(id)) {
    return id.flatMap((currentId) => getElement(currentId));
  }

  return getElement(id);
}

function parseId(raw: string): [id: string, schema: string, selector: string] | null {
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

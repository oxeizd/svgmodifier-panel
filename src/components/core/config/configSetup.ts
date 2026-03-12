import { RegexCheck } from '../utils';
import { applySchema } from './utils';
import { ConfigRules, DataMap, QueryType } from '../../types';
import { FieldFilterMap, parseFilter } from '../handler/metricsfilter';

export function initializeConfig(svg: Document, config: ConfigRules[]) {
  const configMap: Map<string, DataMap> = new Map();

  const elementsMap = new Map<string, SVGElement>();
  const elements = svg.querySelectorAll<SVGElement>('[id^="cell"]');

  for (const el of elements) {
    el.id && elementsMap.set(el.id, el);
  }

  if (elementsMap.size > 0) {
    prepareConfig(config, elementsMap, configMap);
  }

  return configMap;
}

function prepareConfig(changes: ConfigRules[], elementsMap: Map<string, SVGElement>, configMap: Map<string, DataMap>) {
  const getRuleConfig = (rule: ConfigRules) => {
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

      if (configToUse.metrics) {
        for (const metric of configToUse.metrics) {
          if (metric.queries && Array.isArray(metric.queries)) {
            metric.queries = metric.queries.map((q: QueryType) => {
              const newQ: any = { ...q };

              if (typeof newQ.filter === 'string' && newQ.filter.trim()) {
                newQ.filter = parseFilter(newQ.filter) as FieldFilterMap | undefined;
              }

              return newQ;
            });
          }
        }
      }

      const additional = {
        attributes: configToUse,
        selector,
        elemIndex: currentIndex,
        elemsLength,
      };

      if (configMap.get(id)) {
        configMap.get(id)?.additional.push(additional);
      } else {
        configMap.set(id, { SVGElem: svgElement, additional: [additional] });
      }

      if (!selector) {
        currentIndex++;
      } else {
        elemsLength = elemsLength - 1;
      }
    });
  };

  for (const rule of changes) {
    if (!rule.id || !rule.attributes) {
      continue;
    }

    getRuleConfig(rule);
  }
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

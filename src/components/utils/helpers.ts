import { Change, DataMap, Metric, ValueMapping } from 'types';
import YAML from 'yaml';

/**
 **/
export function parseYamlConfig(yamlText: string, replaceVariables?: (content: string) => string): Change[] | null {
  const options = { maxAliasCount: 10000 };
  try {
    const yaml = YAML.parse(yamlText, options);

    if (yaml && 'changes' in yaml && Array.isArray(yaml.changes)) {
      return yaml.changes as Change[];
    }

    return null;
  } catch {
    return null;
  }
}

// export function parseRules(inputRaw: string) {
//   const input = inputRaw.replace(/\r\n/g, '\n');
//   const marker = 'changes:\n';
//   const p = input.indexOf(marker);
//   if (p === -1) return;

//   const header = input.slice(0, p + marker.length);
//   const tail = input.slice(p + marker.length);
//   const items = tail.split(/\n(?=  - id:)/).map(s => s.replace(/^\n/, '')).filter(Boolean);
//   items.forEach((item, index) => {
//     const fullYaml = header + item;
//     const parsed = YAML.parse(fullYaml, { strict: false });
//     if (parsed) {
//       console.log(`Элемент ${index}:`, parsed);
//     } else {
//       console.log('error')
//     }
//   });
// }

/**
 * Форматирует число с заданным количеством десятичных знаков.
 */
export const roundToFixed = (value: number, decimals = 3): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * Сравнивает два числа с помощью оператора
 */
export function compareValues(a: number, b: number, operator: string): boolean {
  switch (operator) {
    case '<':
      return a < b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '=':
      return a === b;
    case '!=':
      return a !== b;
    default:
      return false;
  }
}

/**
 * Проверяет, содержит ли строка специальные символы для регулярных выражений.
 */
export function RegexCheck(value: string): boolean {
  const regexSpecialChars = /[.*+?^${}()|[\]\\]/;

  if (regexSpecialChars.test(value)) {
    return true;
  }
  return false;
}

/**
 *
 */
export function matchPattern(pattern: string, target: string): boolean {
  if (pattern === target) {
    return true;
  }

  if (RegexCheck(pattern)) {
    try {
      return new RegExp(pattern).test(target);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 *
 */
export function getMappingMatch(mappings: ValueMapping[] | undefined, value: number): string | undefined {
  if (!mappings) {
    return undefined;
  }

  const sortMappings = (mappings: ValueMapping[]): ValueMapping[] => {
    return [...mappings].sort((a, b) => {
      const aVal = a.value ?? 0;
      const bVal = b.value ?? 0;
      const aIsHighPriority = a.condition && ['>', '>='].includes(a.condition);
      const bIsHighPriority = b.condition && ['>', '>='].includes(b.condition);

      return aIsHighPriority === bIsHighPriority ? aVal - bVal : aIsHighPriority ? -1 : 1;
    });
  };

  const valueMapping = sortMappings(mappings);

  for (let i = valueMapping.length - 1; i >= 0; i--) {
    const mapping = valueMapping[i];
    if (mapping.value !== undefined && mapping.condition && compareValues(value, mapping.value, mapping.condition)) {
      return mapping.label;
    }
  }

  return undefined;
}

/**
 * Schemas for quick configuration setup
 */
export function applySchema(attributes: any, schema: string) {
  if (!schema) {
    return attributes;
  }

  const result = { ...attributes };

  const processMetrics = (metrics: Metric | Metric[], processor: (metric: Metric) => Metric) => {
    if (Array.isArray(metrics)) {
      return metrics.map(processor);
    }
    return processor(metrics);
  };

  const schemaActions: Record<string, () => void> = {
    basic: () => {
      delete result.label;
      delete result.labelColor;
      result.tooltip = result.tooltip || { show: true };
      if (result.metrics) {
        result.metrics = processMetrics(result.metrics, (metric: Metric) => ({
          ...metric,
          filling: 'fill',
          baseColor: metric.baseColor || '#00ff00',
        }));
      }
    },
    stroke: () => {
      const propsToDelete = ['link', 'label', 'labelColor', 'tooltip'];
      propsToDelete.forEach((p) => delete result[p]);
      if (result.metrics) {
        result.metrics = processMetrics(result.metrics, (metric: Metric) => ({
          ...metric,
          filling: 'stroke',
          baseColor: '',
        }));
      }
    },
    strokeBase: () => {
      const propsToDelete = ['link', 'label', 'labelColor', 'tooltip'];
      propsToDelete.forEach((p) => delete result[p]);
      if (result.metrics) {
        result.metrics = processMetrics(result.metrics, (metric: Metric) => ({
          ...metric,
          filling: 'stroke',
        }));
      }
    },
    text: () => {
      delete result.link;
      delete result.tooltip;
      result.label = result.label || 'replace';
      result.labelColor = result.labelColor || 'metric';
      if (result.metrics) {
        result.metrics = processMetrics(result.metrics, (metric: Metric) => ({
          ...metric,
          filling: 'none',
          baseColor: metric.baseColor || '',
        }));
      }
    },
    table: () => {
      delete result.link;
      delete result.tooltip;
      result.label = result.label || 'replace';
      result.labelColor = result.labelColor || 'metric';
      if (result.metrics) {
        result.metrics = processMetrics(result.metrics, (metric: Metric) => ({
          ...metric,
          filling: 'fill, 20',
          baseColor: metric.baseColor || '#00ff00',
        }));
      }
    },
  };

  schemaActions[schema]?.();
  return result;
}

export function cleanupResources(
  elements: Map<string, SVGElement> | undefined,
  configMap: Map<string, DataMap>,
  tempDocument?: Document | undefined
): void {
  if (elements) {
    elements.clear();
  }

  if (tempDocument) {
    const svgElement = tempDocument.documentElement;
    if (svgElement) {
      while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
      }
    }
    (tempDocument as any) = null;
  }

  configMap.forEach((item) => {
    if (item.SVGElem) {
      item.SVGElem = null;
    }
  });
  configMap.clear();
}

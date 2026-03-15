import { ConfigRules, Metrics, filter } from 'components/types';
import YAML from 'yaml';

/**
 **/
export function parseYamlConfig(
  yamlText: string,
  replaceVariables?: (content: string) => string
): ConfigRules[] | null {
  const options = { maxAliasCount: 10000 };
  try {
    const yaml = YAML.parse(yamlText, options);

    if (yaml && 'changes' in yaml && Array.isArray(yaml.changes)) {
      return yaml.changes as ConfigRules[];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Schemas for quick configuration setup
 */
export function applySchema(attributes: any, schema: string) {
  if (!schema) {
    return attributes;
  }

  const result = { ...attributes };

  const processMetrics = (metrics: Metrics | Metrics[], processor: (metric: Metrics) => Metrics) => {
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
        result.metrics = processMetrics(result.metrics, (metric: Metrics) => ({
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
        result.metrics = processMetrics(result.metrics, (metric: Metrics) => ({
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
        result.metrics = processMetrics(result.metrics, (metric: Metrics) => ({
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
        result.metrics = processMetrics(result.metrics, (metric: Metrics) => ({
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
        result.metrics = processMetrics(result.metrics, (metric: Metrics) => ({
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

export function parseFilter(text: string): filter | undefined {
  if (!text || !text.trim()) {
    return undefined;
  }

  const filterMap: filter = { include: {}, exclude: {} };

  const FILTER_DELIMITER = ',';
  const VALUE_DELIMITER = '|';
  const TABLE_PREFIX = ':';
  const EXCLUSION_PREFIX = '-';
  const DATE_FILTER_PREFIX = '$date';

  const fieldConditions = text
    .split(FILTER_DELIMITER)
    .map((cond) => cond.trim())
    .filter(Boolean);

  const checkConditions = (condition: string): string[] => {
    return condition
      .split(VALUE_DELIMITER)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((c) => (c.startsWith(DATE_FILTER_PREFIX) ? calculateTargetDate(parseDaysFromDateFilter(c)) : c));
  };

  for (const rawCondition of fieldConditions) {
    const isExclusion = rawCondition.startsWith(EXCLUSION_PREFIX);
    const condition = isExclusion ? rawCondition.slice(1).trim() : rawCondition;

    const tablePrefix = condition.indexOf(TABLE_PREFIX);
    let header = '';
    let values = condition;

    if (tablePrefix !== -1) {
      header = condition.slice(0, tablePrefix).trim();
      values = condition.slice(tablePrefix + 1);
    }

    const checkedConditions = checkConditions(values);

    const targetMap = isExclusion ? filterMap.exclude : filterMap.include;
    if (!targetMap[header]) {
      targetMap[header] = [];
    }
    targetMap[header].push(...checkedConditions);
  }

  return filterMap;
}

const parseDaysFromDateFilter = (filterValue: string): number => {
  const match = filterValue.match(/^\$date(-?\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
};

const calculateTargetDate = (days: number): string => {
  const currentDate = new Date();
  const targetDate = new Date(currentDate);
  targetDate.setDate(currentDate.getDate() + days);
  return targetDate.toISOString().split('T')[0];
};

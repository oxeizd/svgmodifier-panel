import { ConfigRules, Metrics, filter } from 'components/types';
import YAML from 'yaml';

/**
 **/
interface Page {
  page: string;
  code: string;
}

export function parseYamlConfig(input: Page[] | string | string[] | undefined): ConfigRules[] | null {
  if (!input) {
    return null;
  }

  let pagesCode: string[] = [];

  if (Array.isArray(input) && input.every((item) => typeof item === 'object' && 'code' in item)) {
    pagesCode = input.map((p) => p.code);
  } else if (Array.isArray(input) && input.every((item) => typeof item === 'string')) {
    pagesCode = input;
  } else if (typeof input === 'string') {
    pagesCode = [input];
  } else {
    return null;
  }

  pagesCode = pagesCode.filter((code) => code && code.trim().length > 0);
  if (pagesCode.length === 0) {
    return null;
  }

  const wrappedPages = pagesCode.map((code, idx) => {
    const indented = code
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n');
    return `page_${idx}:\n${indented}`;
  });

  const combinedYaml = wrappedPages.join('\n');

  let root: any;

  try {
    root = YAML.parse(combinedYaml, { maxAliasCount: 10000 });
  } catch (err) {
    console.error('[parseYamlConfig] YAML parse error:', err);
    return null;
  }

  if (!root || typeof root !== 'object') {
    return null;
  }

  let merged: any = {};

  for (let i = 0; i < pagesCode.length; i++) {
    const pageKey = `page_${i}`;
    const pageData = root[pageKey];
    if (!pageData || typeof pageData !== 'object') {
      continue;
    }

    for (const key of Object.keys(pageData)) {
      if (key === 'changes') {
        const changesArray = pageData.changes;
        if (Array.isArray(changesArray)) {
          if (!merged.changes) {
            merged.changes = [];
          }
          merged.changes.push(...changesArray);
        }
      } else {
        merged[key] = pageData[key];
      }
    }
  }

  if (merged.changes && Array.isArray(merged.changes)) {
    return merged.changes as ConfigRules[];
  }

  console.warn('[parseYamlConfig] No "changes" array found in merged config');
  return null;
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

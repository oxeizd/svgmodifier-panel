import { Expr } from 'types';
import { TimeRange } from '@grafana/data';
import { DataFrameMap } from '../extractor/dataExtractor';
import { CalculationMethod, Metrics, Threshold, ValueMapping } from 'components/types';

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
 *
 */
export function getMappingMatch(mapping: ValueMapping[], value: number, decimal?: number): string | undefined {
  if (!mapping.length) {
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

  const replaceLabel = (label: string, value: number): string => {
    const formattedValue = roundToFixed(value, decimal);
    return label.replace(/\{{value\}}/g, formattedValue.toString());
  };

  const valueMapping = sortMappings(mapping);

  for (let i = valueMapping.length - 1; i >= 0; i--) {
    const mapping = valueMapping[i];
    if (mapping.value !== undefined && mapping.condition && compareValues(value, mapping.value, mapping.condition)) {
      return replaceLabel(mapping.label, value);
    }
  }

  return undefined;
}

/**
 *
 */
export function calculateValue(values: number[], method: CalculationMethod): number {
  if (values.length === 0) {
    return 0;
  }

  let result: number;
  switch (method) {
    case 'last':
      result = values[values.length - 1];
      break;
    case 'total':
      result = values.reduce((a, b) => a + b, 0);
      break;
    case 'max':
      result = Math.max(...values);
      break;
    case 'min':
      result = Math.min(...values);
      break;
    case 'count':
      result = values.length;
      break;
    case 'delta':
      result = values[values.length - 1] - values[0];
      break;
    default:
      result = values[values.length - 1];
  }

  return result;
}

/**
 *
 */
export function getMetricColor(value: number, dataFrame: DataFrameMap, thresholds?: Threshold[], baseColor?: string) {
  let lvl = 0;
  let color = baseColor;

  thresholds?.forEach((threshold, index) => {
    if (threshold.condition && !evaluateThresholdCondition(threshold.condition, dataFrame)) {
      return;
    }

    const comparisonResult = compareValues(value, threshold.value, threshold.operator || '>=');

    if (comparisonResult) {
      color = threshold.color;
      lvl = threshold.lvl || index + 1;
    }
  });

  return { color, lvl };
}

/**
 *
 */
export function getMath(expression: string, dataFrame: DataFrameMap) {
  const variableRegex =
    /\$([А-Яа-яЁёA-Za-z0-9_]+)(?:\.([А-Яа-яЁёA-Za-z0-9_ -]+))?(?::(last|total|max|min|count|delta))?/g;

  return String(
    expression.replace(
      variableRegex,
      (_match: string, refId: string, subKey: string, calculationMethod: CalculationMethod = 'last') => {
        if (refId !== undefined) {
          refId = refId.trim();
          const metricData = dataFrame.get(refId);
          if (metricData) {
            let value = 0;
            if (subKey !== undefined) {
              subKey = subKey.trim();
              const subKeyValues = metricData.values.get(subKey);
              if (subKeyValues) {
                const numericValues: number[] = subKeyValues.values.map(Number);
                value = calculateValue(numericValues, calculationMethod);
              }
            } else {
              // Если subKey не указан, берем первое значение из метрики
              const firstValue = Array.from(metricData.values.values())[0];
              if (firstValue) {
                const numericValues: number[] = firstValue.values.map(Number);
                value = calculateValue(numericValues, calculationMethod);
              }
            }
            return value.toFixed(2);
          }
        }
        return '0';
      }
    )
  );
}

/**
 *
 */
export function evaluateThresholdCondition(condition: string, dataFrame: DataFrameMap): boolean {
  let result = false;

  try {
    const now = new Date();
    const timezone = parseInt(condition.match(/timezone\s*=\s*(-?\d+)/)?.[1] || '3', 10);
    const hour = (now.getUTCHours() + timezone + 24) % 24;
    const sanitizedCondition = condition.replace(/timezone\s*=\s*(-?\d+),?/, '').trim();

    const metricsCondition = getMath(sanitizedCondition, dataFrame);

    result = new Function('hour', 'minute', 'day', `return ${metricsCondition}`)(
      hour,
      now.getUTCMinutes(),
      now.getUTCDay()
    );
  } catch (error) {
    result = false;
  }

  return result;
}

/**
 *
 */
export async function calculateExpressions(expressions: Expr[], dataFrame: DataFrameMap, timeRange: TimeRange) {
  if (!expressions.length || !dataFrame) {
    return;
  }

  const meticTime = timeRange.to.valueOf();

  for (const expr of expressions) {
    if (!dataFrame.has(expr.refId) && expr.expression && expr.expression.trim() !== '') {
      const math = getMath(expr.expression, dataFrame);
      if (math && math.length > 0) {
        try {
          const result = Function('"use strict";return (' + math + ')')();
          dataFrame.set(expr.refId, {
            values: new Map([[expr.refId, { values: [String(result)], timestamps: [meticTime] }]]),
          });
        } catch {}
      }
    }
  }
}

/**
 *  LEGACY-------------------------------------------------
 */
export function processLegacyMetric(metric: any): Metrics {
  // Если нет legacy полей, возвращаем как есть
  if (!metric.refIds && !metric.legends) {
    return metric;
  }

  // Создаем копию метрики
  const newMetric = { ...metric };

  // Создаем массив queries из legacy структур
  const queries: any[] = [];

  // Преобразуем refIds
  if (metric.refIds && Array.isArray(metric.refIds)) {
    metric.refIds.forEach((item: any) => {
      if (item && item.refid) {
        queries.push({ ...item });
      }
    });
  }

  // Преобразуем legends
  if (metric.legends && Array.isArray(metric.legends)) {
    metric.legends.forEach((item: any) => {
      if (item && item.legend) {
        queries.push({ ...item });
      }
    });
  }

  // Заменяем старые поля на queries
  if (queries.length > 0) {
    newMetric.queries = queries;
  }

  // Удаляем старые поля
  delete (newMetric as any).refIds;
  delete (newMetric as any).legends;

  return newMetric;
}

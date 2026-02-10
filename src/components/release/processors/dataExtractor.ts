import { Expr } from 'types';
import { getMath } from './queryProcessor';
import { DataFrame, FieldType, getFieldDisplayName, TimeRange } from '@grafana/data';

export type DataFrameMap = Map<
  string,
  {
    type?: string;
    values: Map<string, { values: string[]; timestamps?: number[] }>;
  }
>;

export async function extractFieldsV2(dataFrame: DataFrame[], customRT: string, fieldRT: string, timeRange: TimeRange) {
  const valueMap: DataFrameMap = new Map();
  const fieldTimeSettings = fieldRT ? parseFieldTimeSettings(fieldRT) : new Map();

  for (const frame of dataFrame) {
    if (!frame.refId || !frame.fields?.length) {
      continue;
    }

    const { refId, fields, meta } = frame;
    const visualType = meta?.preferredVisualisationType;
    const CustomRangetime = fieldTimeSettings.get(refId) || customRT;

    if (visualType === 'graph' || frame.fields.length === 2) {
      const timeField = fields.find((field) => field.type === FieldType.time);
      const valueField = fields.find((field) => field.type === FieldType.number);

      if (!valueField) {
        continue;
      }

      let values = valueField?.values.map(String) || [];
      let timestamps = timeField?.values.map(Number) || [];
      const valueFieldName = getFieldDisplayName(valueField, frame, dataFrame);

      if (CustomRangetime) {
        const result = getRelativeTimeRange(timestamps, values, CustomRangetime, timeRange);
        values = result.values;
        timestamps = result.timestamps;
      }

      addToMap(refId, valueMap, values, valueFieldName, timestamps, 'graph');
      continue;
    }

    for (const field of fields) {
      if (!field.values) {
        continue;
      }

      const values = field.values.map(String);
      const valueFieldName = getFieldDisplayName(field, frame, dataFrame);

      addToMap(refId, valueMap, values, valueFieldName, undefined, 'table');
    }
  }

  return valueMap;
}

function addToMap(
  refId: string,
  valueMap: DataFrameMap,
  values: string[],
  displayName: string,
  timestamps?: number[],
  type?: string
) {
  if (!valueMap.has(refId)) {
    valueMap.set(refId, { values: new Map(), type: type });
  }

  let uniqueName = displayName;
  const refStore = valueMap.get(refId)!;

  let counter = 1;
  while (refStore.values.has(uniqueName)) {
    uniqueName = `${displayName}_${counter}`;
    counter++;
  }

  refStore.values.set(uniqueName, { values: values, timestamps: timestamps });
}

function parseFieldTimeSettings(fieldsRT?: string): Map<string, string> {
  const fieldTimeMap = new Map<string, string>();

  if (!fieldsRT?.trim()) {
    return fieldTimeMap;
  }

  try {
    // Разделяем по точкам с запятой
    const rules = fieldsRT.split(';').filter((rule) => rule.trim());

    for (const rule of rules) {
      const [fieldsPart, timePart] = rule.split(':').map((part) => part.trim());

      if (!fieldsPart || !timePart) {
        continue;
      }

      // Разделяем поля по запятым
      const fieldNames = fieldsPart.split(',').map((field) => field.trim());
      const timeValue = timePart.trim();

      // Добавляем каждое поле в map
      for (const fieldName of fieldNames) {
        if (fieldName) {
          fieldTimeMap.set(fieldName, timeValue);
        }
      }
    }
  } catch {}

  return fieldTimeMap;
}

function getRelativeTimeRange(
  timestamps: number[],
  values: string[],
  relativeTime: string,
  timeRange: TimeRange
): {
  timestamps: number[];
  values: string[];
} {
  const timeUnits: { [key: string]: number } = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  const unit = relativeTime.slice(-1);
  const value = parseInt(relativeTime.slice(0, -1), 10);

  if (!timeUnits[unit]) {
    return { timestamps, values };
  }

  const endTime = timeRange.to.valueOf();
  const timeRangeMs = value * timeUnits[unit];
  const startTime = endTime - timeRangeMs;

  // Находим индексы элементов, попадающих в диапазон
  const filteredIndices: number[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] >= startTime && timestamps[i] <= endTime) {
      filteredIndices.push(i);
    }
  }

  if (filteredIndices.length === 0) {
    return {
      timestamps: [],
      values: [],
    };
  }

  // Фильтруем оба массива по найденным индексам
  const relativeTimeStamps = filteredIndices.map((i) => timestamps[i]);
  const Values = filteredIndices.map((i) => values[i]);

  return {
    timestamps: relativeTimeStamps,
    values: Values,
  };
}

export async function calculateExpressionsV2(expressions: Expr[], dataFrame: DataFrameMap, timeRange: TimeRange) {
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
        } catch (er) {}
      }
    }
  }
}

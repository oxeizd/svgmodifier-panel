import { DataFrame, Field, FieldType } from '@grafana/data';

export function extractValues(dataFrame: DataFrame[], customRelativeTime: string, fieldRelativeTime: string) {
  const valueMap = new Map<string, { values: Map<string, { values: string[]; timestamps: number[] }> }>();

  const fieldTimeSettings = fieldRelativeTime ? parseFieldTimeSettings(fieldRelativeTime) : new Map();

  for (let i = 0; i < dataFrame.length; i++) {
    const frame: DataFrame = dataFrame[i];
    const timeField = frame.fields.find((field) => field.type === FieldType.time);
    const metricValueField = frame.fields.find((field) => field.type === FieldType.number);

    if (!metricValueField?.values?.length || !timeField?.values?.length) {
      continue;
    }

    const refId = frame.refId;
    if (!refId) {
      continue;
    }

    let timeToUse: string | undefined;
    let values = metricValueField.values.map(String);
    let timestamps = timeField.values.map(Number);

    if (fieldTimeSettings.has(refId)) {
      timeToUse = fieldTimeSettings.get(refId);
    } else if (customRelativeTime) {
      timeToUse = customRelativeTime;
    }

    if (timeToUse) {
      const result = getRelativeTimeRange(timestamps, values, timeToUse);
      timestamps = result.timestamps;
      values = result.values;
    }

    if (timestamps.length === 0 || values.length === 0) {
      continue;
    }

    // Получаем имя на основе меток или названия поля
    const displayName = resolveDisplayName(metricValueField);

    // Инициализируем хранилище для refId
    if (!valueMap.has(refId)) {
      valueMap.set(refId, { values: new Map() });
    }
    const refStore = valueMap.get(refId)!;

    // Генерируем уникальное имя для значений
    let uniqueName = displayName;
    let counter = 1;
    while (refStore.values.has(uniqueName)) {
      uniqueName = `${displayName}_prfx${counter}`;
      counter++;
    }

    refStore.values.set(uniqueName, { values: values, timestamps: timestamps });
  }

  return valueMap;
}

function resolveDisplayName(field: Field): string {
  // 1. Пытаемся использовать displayNameFromDS
  if (field.config?.displayNameFromDS) {
    return field.config.displayNameFromDS;
  }

  // 2. Собираем метки в формате {key1="value1", key2="value2"}
  if (field.labels && Object.keys(field.labels).length > 0) {
    const labels = Object.entries(field.labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(', ');
    return `{${labels}}`;
  }

  // 3. Используем название поля
  return field.name || 'unnamed';
}

function getRelativeTimeRange(
  timestamps: number[],
  values: string[],
  relativeTime: string
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

  const timeRangeMs = value * timeUnits[unit];
  const lastTimestamp = timestamps[timestamps.length - 1];
  const startTime = lastTimestamp - timeRangeMs;

  // Находим индексы элементов, попадающих в диапазон
  const filteredIndices: number[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] >= startTime && timestamps[i] <= lastTimestamp) {
      filteredIndices.push(i);
    }
  }

  // Фильтруем оба массива по найденным индексам
  const relativeTimeStamps = filteredIndices.map((i) => timestamps[i]);
  const Values = filteredIndices.map((i) => values[i]);

  return {
    timestamps: relativeTimeStamps,
    values: Values,
  };
}

function parseFieldTimeSettings(fieldsCustomRelativeTime?: string): Map<string, string> {
  const fieldTimeMap = new Map<string, string>();

  if (!fieldsCustomRelativeTime?.trim()) {
    return fieldTimeMap;
  }

  try {
    // Разделяем по точкам с запятой
    const rules = fieldsCustomRelativeTime.split(';').filter((rule) => rule.trim());

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

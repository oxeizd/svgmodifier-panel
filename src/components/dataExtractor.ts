import { DataFrame, Field, FieldType } from '@grafana/data';

export class DataExtractor {
  private dataFrame: DataFrame[];

  constructor(dataFrame: DataFrame[]) {
    this.dataFrame = dataFrame;
  }

  public extractValues(): Map<string, { values: Map<string, string[]> }> {
    const valueMap = new Map<string, { values: Map<string, string[]> }>();

    this.dataFrame.forEach((frame: DataFrame) => {
      const metricValueField = frame.fields.find((field) => field.type === FieldType.number);
      if (!metricValueField?.values?.length) {
        return;
      }

      const refId = frame.refId;
      if (!refId) {
        return;
      }

      // Получаем имя на основе меток или названия поля
      const displayName = this.resolveDisplayName(metricValueField);

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

      // Сохраняем значения
      const values = metricValueField.values.map(String);
      refStore.values.set(uniqueName, values);
    });
    return valueMap;
  }

  private resolveDisplayName(field: Field): string {
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
}

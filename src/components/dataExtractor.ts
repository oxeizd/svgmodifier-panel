import { DataFrame, FieldType } from '@grafana/data';

export class DataExtractor {
  private dataFrame: DataFrame[];

  constructor(dataFrame: DataFrame[]) {
    this.dataFrame = dataFrame;
  }

  public extractValues(): Map<string, { values: Map<string, string[]> }> {
    const valueMap = new Map<string, { values: Map<string, string[]> }>();

    this.dataFrame.forEach((frame: DataFrame) => {
      const metricValueField = frame.fields.find((field) => field.type === FieldType.number);
      if (!metricValueField || !metricValueField.values) {
        return; // Прекращаем выполнение, если поле не найдено или значения отсутствуют
      }
      
      const refId = frame.refId;
      const displayNameFromDS = metricValueField.config?.displayNameFromDS;

      if (refId) {

        if (!valueMap.has(refId)) {
          valueMap.set(refId, { values: new Map<string, string[]>() });
        }

        const currentValuesMap = valueMap.get(refId)!.values;

        // Создаем уникальное имя для массива
        let uniqueArrayName = displayNameFromDS ? displayNameFromDS : 'absent_0';
        let index = 1;

        // Проверяем, существует ли массив с таким именем, и добавляем суффикс, если необходимо
        while (currentValuesMap.has(uniqueArrayName)) {
          uniqueArrayName = `${displayNameFromDS || 'absent'}_${index}`;
          index++;
        }

        // Создаем новый массив для текущего displayName или refId
        currentValuesMap.set(uniqueArrayName, []);

        // Добавляем новые значения в массив для текущего displayName или refId
        const stringValues = metricValueField.values.map((value) => String(value)); // Преобразуем значения в строки
        if (stringValues.length > 0) {
          currentValuesMap.get(uniqueArrayName)!.push(...stringValues);
        }

      }
    });

    return valueMap;
  }
}

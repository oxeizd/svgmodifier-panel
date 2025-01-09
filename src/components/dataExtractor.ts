import { DataFrame, FieldType } from '@grafana/data';

export class DataExtractor {
  private dataFrame: DataFrame[];

  constructor(dataFrame: DataFrame[]) {
    this.dataFrame = dataFrame;
  }

  public extractValues(): Map<string, { values: number[]; displayNames: string[] }> {
    const valueMap = new Map<string, { values: number[]; displayNames: string[] }>();

    this.dataFrame.forEach((frame: DataFrame) => {
      const metricValueField = frame.fields.find((field) => field.type === FieldType.number);
      if (!metricValueField) {
        return;
      }

      const refId = frame.refId;
      const displayNameFromDS = metricValueField.config?.displayNameFromDS;

      if (refId) {
        const value = metricValueField.values[metricValueField.values.length - 1];
        if (value !== undefined) {
          if (!valueMap.has(refId)) {
            valueMap.set(refId, { values: [], displayNames: [] });
          }
          valueMap.get(refId)?.values.push(value);
          valueMap.get(refId)?.displayNames.push(displayNameFromDS || refId);
        }
      }
    });
    return valueMap;
  }
}

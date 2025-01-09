import { Legends, Metric, RefIds, Threshold } from './types';

export class MetricProcessor {
  private element: SVGElement;
  private metrics: Metric[];
  private extractedValueMap: Map<string, { values: number[]; displayNames: string[] }>;

  constructor(
    element: SVGElement,
    metrics: Metric[],
    extractedValueMap: Map<string, { values: number[]; displayNames: string[] }>
  ) {
    this.element = element;
    this.metrics = metrics;
    this.extractedValueMap = extractedValueMap;
  }

  public process(): { color: Array<{ id: string; refId: string; label: string; color: string; metric: number }> } {
    const elementId = this.element.id;
    const colorData: Array<{ id: string; refId: string; label: string; color: string; metric: number }> = [];

    if (!Array.isArray(this.metrics)) {
      return { color: [] };
    }

    this.metrics.forEach((metric: Metric) => {
      const { refIds, legends, baseColor, thresholds, displayText, decimal } = metric;

      if (refIds) {
        this.refIds(elementId, refIds, colorData, thresholds, decimal, baseColor, displayText);
      }
      if (legends) {
        this.legends(elementId, legends, colorData, thresholds, decimal, baseColor, displayText);
      }
    });

    return { color: colorData };
  }

  private refIds(
    elementId: string,
    refIds: RefIds[],
    colorData: Array<{ id: string; refId: string; label: string | undefined; color: string; metric: number }>,
    thresholds?: Threshold[] | undefined,
    decimal?: number,
    baseColor?: string,
    displayText?: string
  ) {
    if (refIds) {
      refIds.forEach((el) => {
        if (el.refid) {
          const data = this.getNameAndValue(el.refid, el.filter);
          const values = data.map((item) => item.value);
          if (el.refid && el.sum && el.sum.length > 0) {
            const sumValue = this.calculateSum(values);
            colorData.push({
              id: elementId,
              refId: el.refid,
              label: displayText || el.sum,
              color: this.MetricColor(sumValue, thresholds, baseColor) || '',
              metric: sumValue,
            });
          } else {
            this.pushToColorData(elementId, el.refid, data, colorData, thresholds, decimal, baseColor, displayText);
          }
        }
      });
    }
  }

  private legends(
    elementId: string,
    legends: Legends[],
    colorData: Array<{ id: string; refId: string; label: string | undefined; color: string; metric: number }>,
    thresholds?: Threshold[] | undefined,
    decimal?: number,
    baseColor?: string,
    displayText?: string
  ) {
    if (legends) {
      legends.forEach((el) => {
        if (el.legend) {
          const data = this.getNameAndValue(el.legend, el.filter);
          const values = data.map((item) => item.value);
          if (el.sum && el.sum.length > 0) {
            const sumValue = this.calculateSum(values);
            colorData.push({
              id: elementId,
              refId: el.legend,
              label: displayText || el.sum,
              color: this.MetricColor(sumValue, thresholds, baseColor),
              metric: sumValue,
            });
          } else {
            this.pushToColorData(elementId, 'A', data, colorData, thresholds, decimal, baseColor, displayText);
          }
        }
      });
    }
  }

  private pushToColorData(
    elementId: string,
    id: string,
    data: Array<{ displayName: string; value: any }>, // Измените тип данных на массив объектов
    colorData: Array<{ id: string; refId: string; label: string | undefined; color: string; metric: number }>,
    thresholds?: Threshold[] | undefined,
    decimal?: number,
    baseColor?: string,
    displayText?: string
  ) {
    if (!Array.isArray(data)) {
      return;
    }

    data.forEach((item) => {
      const metricValue =
        decimal !== undefined ? parseFloat(item.value.toFixed(decimal)) : parseFloat(item.value.toFixed(3));
      const displayName = item.displayName;
      const metricColor = this.MetricColor(metricValue, thresholds, baseColor);
      colorData.push({
        id: elementId,
        refId: id,
        label: displayText || displayName,
        color: metricColor,
        metric: metricValue,
      });
    });
  }

  private calculateSum(values: number[], decimal?: number): number {
    const decimalPlaces = decimal !== undefined ? decimal : 3;

    return values.reduce((sum, value) => {
      return sum + parseFloat(value.toFixed(decimalPlaces));
    }, 0);
  }

  private getNameAndValue(id: string, filter?: string): Array<{ displayName: string; value: any }> {
    const metricData = this.extractedValueMap.get(id);
    const currentDate = new Date();

    const result: Array<{ displayName: string; value: any }> = [];

    // Если filter не задан и metricData существует
    if (!filter && metricData) {
      metricData.displayNames.forEach((displayName, index) => {
        result.push({ displayName, value: metricData.values[index] });
      });
      return result;
    }

    // Если metricData не найдена
    if (!filter && !metricData) {
      for (const [_, metricDataEntry] of this.extractedValueMap.entries()) {
        const matches = this.isRegex(id)
          ? metricDataEntry.displayNames.some((displayName) => this.matchRegex(id, displayName))
          : metricDataEntry.displayNames.includes(id);

        if (matches) {
          metricDataEntry.displayNames.forEach((displayName, index) => {
            if (this.isRegex(id) ? this.matchRegex(id, displayName) : displayName === id) {
              result.push({ displayName, value: metricDataEntry.values[index] });
            }
          });
        }
      }
      return result;
    }

    if (filter) {
      const names = filter.split(',').map((name) => name.trim());

      const addEntriesForName = (name: string, metricData: { displayNames: string[]; values: any[] }) => {
        if (name.startsWith('$date')) {
          const formatDate = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          const daysToSubtract = parseInt(name.replace('$date', '').trim(), 10);
          const targetDate = new Date(currentDate);
          if (!isNaN(daysToSubtract)) {
            targetDate.setDate(currentDate.getDate() - daysToSubtract);
          }
          const formattedDate = formatDate(targetDate);
          metricData.displayNames.forEach((displayName, index) => {
            if (displayName === formattedDate) {
              result.push({ displayName, value: metricData.values[index] });
            }
          });
        } else {
          metricData.displayNames.forEach((displayName, index) => {
            if (displayName === name) {
              result.push({ displayName, value: metricData.values[index] });
            }
          });
        }
      };

      // Если metricData найдена, обрабатываем фильтр
      if (metricData) {
        names.forEach((name) => addEntriesForName(name, metricData));
      } else {
        // Если metricData не найдена, ищем по всем записям
        for (const [_, metricDataEntry] of this.extractedValueMap.entries()) {
          names.forEach((name) => addEntriesForName(name, metricDataEntry));
        }
      }
    }
    return result;
  }

  private isRegex(legend: string): boolean {
    const regexSpecialChars = /[.*+?^${}()|[\]\\]/;

    if (legend.length === 0 || !regexSpecialChars.test(legend)) {
      return false;
    }

    try {
      new RegExp(legend);
      return true;
    } catch (e) {
      return false;
    }
  }

  private matchRegex(regexString: string, displayName: string): boolean {
    const regex = new RegExp(regexString);
    return regex.test(displayName);
  }

  private MetricColor(metricValue: number, thresholds: Threshold[] | undefined, baseColor: string | undefined): string {
    if (!thresholds) {
      return baseColor !== 'none' ? baseColor ?? '' : '';
    }

    let selectedColor: string | undefined;
    let bestThresholdValue: number | undefined;
    let bestThresholdColor: string | undefined;

    for (const threshold of thresholds) {
      const condition = threshold.condition ? this.evaluateCondition(threshold.condition) : true;

      if (condition) {
        const thresholdValue = threshold.value;
        const operator = threshold.operator || '>=';

        let conditionMetForThreshold = false;

        if (operator === '=') {
          conditionMetForThreshold = metricValue === thresholdValue;
          if (conditionMetForThreshold) {
            return threshold.color;
          }
        } else if (operator === '!=') {
          conditionMetForThreshold = metricValue !== thresholdValue;
          if (conditionMetForThreshold) {
            selectedColor = threshold.color;
          }
        } else if (operator === '<') {
          conditionMetForThreshold = metricValue < thresholdValue;
          if (conditionMetForThreshold) {
            if (bestThresholdValue === undefined || thresholdValue < bestThresholdValue) {
              bestThresholdValue = thresholdValue;
              bestThresholdColor = threshold.color;
            }
          }
        } else if (operator === '>') {
          conditionMetForThreshold = metricValue > thresholdValue;
          if (conditionMetForThreshold) {
            if (bestThresholdValue === undefined || thresholdValue > bestThresholdValue) {
              bestThresholdValue = thresholdValue;
              selectedColor = threshold.color;
            }
          }
        } else if (operator === '>=') {
          conditionMetForThreshold = metricValue >= thresholdValue;
          if (conditionMetForThreshold) {
            if (bestThresholdValue === undefined || thresholdValue >= bestThresholdValue) {
              bestThresholdValue = thresholdValue;
              selectedColor = threshold.color;
            }
          }
        } else if (operator === '<=') {
          conditionMetForThreshold = metricValue <= thresholdValue;
          if (conditionMetForThreshold) {
            if (bestThresholdValue === undefined || thresholdValue <= bestThresholdValue) {
              bestThresholdValue = thresholdValue;
              selectedColor = threshold.color;
            }
          }
        }
      }
    }

    return selectedColor || bestThresholdColor || (baseColor !== 'none' ? baseColor ?? '' : '');
  }

  private evaluateCondition(condition: string): boolean {
    const currentTime = new Date();
    const utcHour = currentTime.getUTCHours();
    const utcMinute = currentTime.getUTCMinutes();
    const dayOfWeek = currentTime.getDay();

    const timezoneMatch = condition.match(/timezone\s*=\s*([-+]?\d{1,2})/);
    const timezoneOffset = timezoneMatch ? parseInt(timezoneMatch[1], 10) : 3;

    const hour = (utcHour + timezoneOffset + 24) % 24;
    const minute = utcMinute;

    return new Function('hour', 'minute', 'dayOfWeek', `return ${condition};`)(hour, minute, dayOfWeek);
  }
}

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

  public process(): {
    color: Array<{
      id: string;
      refId: string;
      label: string;
      color: string;
      metric: number;
      filling?: string;
      unit?: string;
    }>;
  } {
    const elementId = this.element.id;
    const colorData: Array<{
      id: string;
      refId: string;
      label: string;
      color: string;
      metric: number;
      filling?: string;
      unit?: string;
    }> = [];

    if (!Array.isArray(this.metrics)) {
      return { color: [] };
    }

    this.metrics.forEach((metric: Metric) => {
      const { refIds, legends, baseColor, thresholds, displayText, decimal, filling } = metric;

      if (refIds) {
        this.processRefIds(elementId, refIds, colorData, thresholds, decimal, baseColor, displayText, filling);
      }
      if (legends) {
        this.processLegends(elementId, legends, colorData, thresholds, decimal, baseColor, displayText, filling);
      }
    });

    return { color: colorData };
  }

  private processRefIds(
    elementId: string,
    refIds: RefIds[],
    colorData: Array<{
      id: string;
      refId: string;
      label: string | undefined;
      color: string;
      metric: number;
      filling?: string;
      unit?: string;
    }>,
    thresholds?: Threshold[],
    decimal?: number,
    baseColor?: string,
    displayText?: string,
    filling?: string
  ): void {
    refIds.forEach((el) => {
      if (el.refid) {
        const data = this.getNameAndValue(el.refid, el.filter);
        const values = data.map((item) => item.value);
        if (el.sum && el.sum.length > 0) {
          const sumValue = this.calculateSum(values);
          colorData.push({
            id: elementId,
            refId: el.refid,
            label: displayText || el.sum,
            color: this.getMetricColor(sumValue, thresholds, baseColor) || '',
            metric: this.formatDecimal(sumValue, decimal),
            filling: filling || '',
            unit: el.unit,
          });
        } else {
          this.pushToColorData(
            elementId,
            el.refid,
            data,
            colorData,
            thresholds,
            decimal,
            baseColor,
            displayText,
            filling,
            el.unit
          );
        }
      }
    });
  }

  private processLegends(
    elementId: string,
    legends: Legends[],
    colorData: Array<{
      id: string;
      refId: string;
      label: string | undefined;
      color: string;
      metric: number;
      filling?: string;
      unit?: string;
    }>,
    thresholds?: Threshold[],
    decimal?: number,
    baseColor?: string,
    displayText?: string,
    filling?: string
  ): void {
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
            color: this.getMetricColor(sumValue, thresholds, baseColor),
            metric: this.formatDecimal(sumValue, decimal),
            filling: filling || '',
            unit: el.unit,
          });
        } else {
          this.pushToColorData(
            elementId,
            el.legend,
            data,
            colorData,
            thresholds,
            decimal,
            baseColor,
            displayText,
            el.unit
          );
        }
      }
    });
  }

  private pushToColorData(
    elementId: string,
    id: string,
    data: Array<{ displayName: string; value: number }>,
    colorData: Array<{
      id: string;
      refId: string;
      label: string | undefined;
      color: string;
      metric: number;
      filling?: string;
      unit?: string;
    }>,
    thresholds?: Threshold[],
    decimal?: number,
    baseColor?: string,
    displayText?: string,
    filling?: string,
    unit?: string
  ): void {
    data.forEach((item) => {
      const metricValue = this.formatDecimal(item.value, decimal);
      const metricColor = this.getMetricColor(metricValue, thresholds, baseColor);
      colorData.push({
        id: elementId,
        refId: id,
        label: displayText || item.displayName,
        color: metricColor,
        metric: metricValue,
        filling: filling || '',
        unit: unit,
      });
    });
  }

  private calculateSum(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0);
  }

  private getNameAndValue(id: string, filter?: string): Array<{ displayName: string; value: number }> {
    const metricData = this.extractedValueMap.get(id);
    const currentDate = new Date();

    const result: Array<{ displayName: string; value: number }> = [];

    if (!filter && metricData) {
      metricData.displayNames.forEach((displayName, index) => {
        result.push({ displayName, value: metricData.values[index] });
      });
      return result;
    }

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

      const addEntriesForName = (name: string, metricData: { displayNames: string[]; values: number[] }) => {
        if (name.startsWith('$date')) {
          const daysToSubtract = parseInt(name.replace('$date', '').trim(), 10);
          const targetDate = new Date(currentDate);
          if (!isNaN(daysToSubtract)) {
            targetDate.setDate(currentDate.getDate() - daysToSubtract);
          }
          const formattedDate = this.formatDate(targetDate);
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

      if (metricData) {
        names.forEach((name) => addEntriesForName(name, metricData));
      } else {
        for (const [_, metricDataEntry] of this.extractedValueMap.entries()) {
          names.forEach((name) => addEntriesForName(name, metricDataEntry));
        }
      }
    }
    return result;
  }

  private isRegex(legend: string): boolean {
    const regexSpecialChars = /[.*+?^${}()|[\]\\]/;
    return legend.length > 0 && regexSpecialChars.test(legend) && this.isValidRegex(legend);
  }

  private isValidRegex(regexString: string): boolean {
    try {
      new RegExp(regexString);
      return true;
    } catch (e) {
      return false;
    }
  }

  private matchRegex(regexString: string, displayName: string): boolean {
    const regex = new RegExp(regexString);
    return regex.test(displayName);
  }

  private getMetricColor(
    metricValue: number,
    thresholds: Threshold[] | undefined,
    baseColor: string | undefined
  ): string {
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

        const conditionMetForThreshold = this.compareValues(metricValue, thresholdValue, operator);

        if (conditionMetForThreshold) {
          if (operator === '=') {
            return threshold.color;
          } else if (operator === '!=') {
            selectedColor = threshold.color;
          } else {
            if (bestThresholdValue === undefined || this.compareValues(thresholdValue, bestThresholdValue, operator)) {
              bestThresholdValue = thresholdValue;
              bestThresholdColor = threshold.color;
            }
          }
        }
      }
    }

    return selectedColor || bestThresholdColor || (baseColor !== 'none' ? baseColor ?? '' : '');
  }

  private compareValues(a: number, b: number, operator: string): boolean {
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

  private formatDecimal(value: number, decimal?: number): number {
    return decimal !== undefined ? parseFloat(value.toFixed(decimal)) : parseFloat(value.toFixed(3));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

import { Legends, Metric, RefIds, Threshold, ColorDataEntry } from './types';

export class MetricProcessor {
  private element: SVGElement;
  private metrics: Metric[];
  private extractedValueMap: Map<string, { values: Map<string, number[]> }>;

  constructor(
    element: SVGElement,
    metrics: Metric[],
    extractedValueMap: Map<string, { values: Map<string, number[]> }>
  ) {
    this.element = element;
    this.metrics = metrics;
    this.extractedValueMap = extractedValueMap;
  }

  public process(): {
    color: ColorDataEntry[];
  } {
    const elementId = this.element.id;
    const colorData: ColorDataEntry[] = [];

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
    console.log(colorData);
    return { color: colorData };
  }

  private processRefIds(
    elementId: string,
    refIds: RefIds[],
    colorData: ColorDataEntry[],
    thresholds?: Threshold[],
    decimal?: number,
    baseColor?: string,
    displayText?: string,
    filling?: string
  ): void {
    refIds.forEach((el) => {
      if (el.refid) {
        const calculation = el.calculation || 'last';
        const data = this.getNameAndValueRef(el.refid, el.filter, calculation);
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
    colorData: ColorDataEntry[],
    thresholds?: Threshold[],
    decimal?: number,
    baseColor?: string,
    displayText?: string,
    filling?: string
  ): void {
    legends.forEach((el) => {
      if (el.legend) {
        const calculation = el.calculation || 'last';
        const data = this.getNameAndValueLegend(el.legend, el.filter, calculation);
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
            filling,
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
    colorData: ColorDataEntry[],
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

  private getNameAndValueRef(
    id: string,
    filter?: string,
    calculation: 'last' | 'total' | 'max' | 'min' | 'count' = 'last'
  ): Array<{ displayName: string; value: number }> {
    
    const currentDate = new Date();

    const result: Array<{ displayName: string; value: number }> = [];

    // Получаем все значения с помощью getDisplayNamesWithValues
    const dataRef = this.getDataForRef(id, calculation);

    // Если фильтр не задан, просто возвращаем все значения
    if (!filter) {
      result.push(...dataRef);
      return result;
    }

    // Обработка фильтров
    const names = filter.split(',').map((name) => name.trim());

    const addEntriesForName = (name: string) => {
      if (name.startsWith('$date')) {
        const daysToSubtract = parseInt(name.replace('$date', '').trim(), 10);
        const targetDate = new Date(currentDate);
        if (!isNaN(daysToSubtract)) {
          targetDate.setDate(currentDate.getDate() - daysToSubtract);
        }
        const formattedDate = this.formatDate(targetDate);

        // Проверяем, если отформатированная дата есть в displayNamesWithValues
        const matchingEntries = dataRef.filter((entry) => entry.displayName === formattedDate);
        result.push(...matchingEntries); // Добавляем все совпадения
      } else {
        // Проверяем, если name есть в displayNamesWithValues
        const matchingEntries = dataRef.filter((entry) => {
          return this.isRegex(name) ? this.matchRegex(name, entry.displayName) : entry.displayName === name;
        });
        result.push(...matchingEntries); // Добавляем все совпадения
      }
    };

    // Проходим по всем именам и добавляем соответствующие записи
    names.forEach((name) => addEntriesForName(name));

    return result;
  }

  private getNameAndValueLegend(
    id: string,
    filter?: string,
    calculation: 'last' | 'total' | 'max' | 'min' | 'count' = 'last'
  ): Array<{ displayName: string; value: number }> {
    const currentDate = new Date();
    const result: Array<{ displayName: string; value: number }> = [];

    // Получаем все значения с помощью getDisplayNamesWithValues
    const dataRef = this.getDataForLegend(id, calculation);

    // Если фильтр не задан, просто возвращаем все значения
    if (!filter) {
      result.push(...dataRef);
      return result;
    }

    // Обработка фильтров
    const names = filter.split(',').map((name) => name.trim());

    const addEntriesForName = (name: string) => {
      if (name.startsWith('$date')) {
        const daysToSubtract = parseInt(name.replace('$date', '').trim(), 10);
        const targetDate = new Date(currentDate);
        if (!isNaN(daysToSubtract)) {
          targetDate.setDate(currentDate.getDate() - daysToSubtract);
        }
        const formattedDate = this.formatDate(targetDate);

        // Проверяем, если отформатированная дата есть в displayNamesWithValues
        const matchingEntries = dataRef.filter((entry) => entry.displayName === formattedDate);
        result.push(...matchingEntries); // Добавляем все совпадения
      } else {
        // Проверяем, если name есть в displayNamesWithValues
        const matchingEntries = dataRef.filter((entry) => {
          return this.isRegex(name) ? this.matchRegex(name, entry.displayName) : entry.displayName === name;
        });
        result.push(...matchingEntries); // Добавляем все совпадения
      }
    };

    // Проходим по всем именам и добавляем соответствующие записи
    names.forEach((name) => addEntriesForName(name));

    return result;
  }

  private getDataForRef(
    id: string,
    calculation: 'last' | 'total' | 'max' | 'min' | 'count' = 'last'
  ): Array<{ displayName: string; value: number }> {
    const result: Array<{ displayName: string; value: number }> = [];

    // Получаем данные для указанного metricId
    const metricData = this.extractedValueMap.get(id);
    if (!metricData) {
      return result; // Возвращаем пустой массив, если данных нет
    }

    // Итерация по значениям в metricData.values
    for (const [key, values] of metricData.values.entries()) {
      const numericValuesArray = values.map((value) => Number(value));

      const value = this.calculateValue(numericValuesArray, calculation);

      const suffixPattern = /_\d+$/;

      if (key.startsWith('absent')) {
        result.push({ displayName: id, value });
      } else if (suffixPattern.test(key)) {
        const name = key.replace(suffixPattern, '');

        result.push({ displayName: name, value });
      } else {
        result.push({ displayName: key, value });
      }
    }

    return result;
  }

  private getDataForLegend(
    id: string,
    calculation: 'last' | 'total' | 'max' | 'min' | 'count' = 'last'
  ): Array<{ displayName: string; value: number }> {
    const result: Array<{ displayName: string; value: number }> = [];
    const suffixPattern = /_\d+$/; // Паттерн для удаления суффиксов

    for (const [_, values] of this.extractedValueMap.entries()) {
      // Проверяем, что values является Map и содержит данные
      if (values && values.values) {
        // Проходим по всем ключам в values
        for (const [valueKey, valueArray] of values.values.entries()) {
          // Удаляем суффикс из valueKey для сравнения
          const baseKey = valueKey.replace(suffixPattern, '');

          // Проверяем соответствие с id
          const matches = this.isRegex(id) ? this.matchRegex(id, baseKey) : baseKey === id;

          if (matches) {
            const numericValuesArray = valueArray.map((value) => Number(value)); // Преобразуем в числа

            // Проверяем, что массив не пустой перед расчетом
            if (numericValuesArray.length > 0) {
              const value = this.calculateValue(numericValuesArray, calculation); // Выполняем расчет

              let displayName = baseKey; // Используем базовый ключ как имя по умолчанию

              if (valueKey.startsWith('absent')) {
                displayName = id; // Если ключ начинается с 'absent', используем id
              }

              result.push({ displayName, value }); // Добавляем в результат
            }
          }
        }
      }
    }

    return result;
  }

  private calculateValue(values: number[], calculation: 'last' | 'total' | 'max' | 'min' | 'count'): number {
    if (values.length === 0) {
      return 0; // или любое другое значение по умолчанию, если массив пуст
    }

    switch (calculation) {
      case 'last':
        return values[values.length - 1];
      case 'total':
        return values.reduce((sum, value) => sum + value, 0);
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      case 'count':
        return values.length; // если вам нужно количество, но это не одно значение
      default:
        return values[values.length - 1]; // по умолчанию возвращаем последнее значение
    }
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

  private calculateSum(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

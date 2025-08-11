import { Legends, Metric, RefIds, Threshold, ColorDataEntry } from './types';

type CalculationMethod = 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';

export class MetricProcessor {
  private metrics: Metric[];

  constructor(
    private element: string,
    metrics: Metric | Metric[],
    private extractedValueMap: Map<string, { values: Map<string, string[]> }>
  ) {
    this.metrics = this.normalizeMetrics(metrics);
  }

  public process(): { color: ColorDataEntry[] } {
    const colorData: ColorDataEntry[] = [];
    if (!Array.isArray(this.metrics)) {
      return { color: [] };
    }

    for (const metric of this.metrics) {
      this.processMetric(metric, colorData);
    }

    return { color: colorData };
  }

  private normalizeMetrics(metrics: Metric | Metric[]): Metric[] {
    return Array.isArray(metrics) ? metrics : [metrics];
  }

  private processMetric(metric: Metric, colorData: ColorDataEntry[]): void {
    // Обработка refIds с предварительной проверкой
    if (metric.refIds?.length) {
      for (let i = 0; i < metric.refIds.length; i++) {
        this.processRef(metric.refIds[i], metric, colorData);
      }
    }

    // Обработка legends с предварительной проверкой
    if (metric.legends?.length) {
      for (let i = 0; i < metric.legends.length; i++) {
        this.processLegend(metric.legends[i], metric, colorData);
      }
    }
  }

  private processRef(ref: RefIds, metric: Metric, colorData: ColorDataEntry[]): void {
    if (!ref.refid) {
      return;
    }

    const metricData = this.extractedValueMap.get(ref.refid);
    if (!metricData) {
      return;
    }

    const items = this.prepareItems(metricData, ref.calculation || 'last');
    this.processItems({
      data: this.applyFilter(items, ref.filter),
      metric,
      config: ref,
      colorData,
      isLegend: false,
      parentKey: ref.refid,
    });
  }

  private processLegend(legend: Legends, metric: Metric, colorData: ColorDataEntry[]): void {
    if (!legend.legend) {
      return;
    }

    const filteredItems: Array<{ displayName: string; value: number; globalKey: string }> = [];

    // Оптимизированный обход extractedValueMap
    for (const [globalKey, metricData] of this.extractedValueMap) {
      for (const [innerKey, values] of metricData.values) {
        if (this.matchPattern(legend.legend, innerKey)) {
          filteredItems.push({
            displayName: innerKey,
            value: this.calculateValue(values.map(Number), legend.calculation || 'last'),
            globalKey,
          });
        }
      }
    }

    if (filteredItems.length === 0) {
      return;
    }

    this.processItems({
      data: this.applyFilter(filteredItems, legend.filter),
      metric,
      config: legend,
      colorData,
      isLegend: true,
    });
  }

  private prepareItems(
    metricData: { values: Map<string, string[]> },
    calculation: CalculationMethod
  ): Array<{ displayName: string; value: number }> {
    const items: Array<{ displayName: string; value: number }> = [];

    for (const [innerKey, values] of metricData.values) {
      const value = this.calculateValue(values.map(Number), calculation);
      items.push({ displayName: innerKey, value });
    }

    return items;
  }

  private processItems(params: {
    data: Array<{ displayName: string; value: number; globalKey?: string }>;
    metric: Metric;
    config: RefIds | Legends;
    colorData: ColorDataEntry[];
    isLegend: boolean;
    parentKey?: string;
  }): void {
    const { data, metric, config, colorData, isLegend, parentKey } = params;
    const { baseColor, displayText, decimal, filling } = metric;

    const sumMode = 'sum' in config && config.sum;
    const thresholdsToUse = this.getThresholds(config, metric);

    if (sumMode) {
      if (data.length === 0) {
        return;
      }

      const sumValue = data.reduce((acc, item) => acc + item.value, 0);
      this.addColorData({
        value: sumValue,
        label: config.label || displayText || config.sum!,
        refId: isLegend ? config.sum! : parentKey || '',
        metric,
        config,
        colorData,
        decimal,
        filling,
        thresholds: thresholdsToUse,
        baseColor,
      });
    } else {
      for (let i = 0; i < data.length; i++) {
        this.addColorData({
          value: data[i].value,
          label: config.label || displayText || data[i].displayName,
          refId: isLegend ? data[i].displayName : parentKey || '',
          metric,
          config,
          colorData,
          decimal,
          filling,
          thresholds: thresholdsToUse,
          baseColor,
        });
      }
    }
  }

  private addColorData(params: {
    value: number;
    label: string;
    refId: string;
    metric: Metric;
    config: RefIds | Legends;
    colorData: ColorDataEntry[];
    decimal?: number;
    filling?: string;
    thresholds?: Threshold[];
    baseColor?: string;
    weight?: number[];
  }): void {
    const { value, label, refId, config, colorData, decimal, filling, thresholds, baseColor, weight } = params;

    const colorResult = this.getMetricColor(value, thresholds, baseColor);

    colorData.push({
      id: this.element,
      refId,
      label,
      color: colorResult.color,
      lvl: colorResult.lvl,
      metric: this.formatDecimal(value, decimal),
      filling: filling || '',
      unit: config.unit,
      title: config.title,
      weight,
    });
  }

  private getThresholds(config: RefIds | Legends, metric: Metric): Threshold[] | undefined {
    return 'thresholds' in config && config.thresholds?.length ? config.thresholds : metric.thresholds;
  }

  private applyFilter(
    data: Array<{ displayName: string; value: number }>,
    filter?: string
  ): Array<{ displayName: string; value: number }> {
    if (!filter) {
      return data;
    }

    const filteredData: Array<{ displayName: string; value: number }> = [];
    const currentDate = new Date();
    const filterParts = filter.split(',');

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let shouldInclude = false;

      for (let j = 0; j < filterParts.length; j++) {
        const trimmed = filterParts[j].trim();
        const isExclusion = trimmed.startsWith('-');
        const filterValue = isExclusion ? trimmed.slice(1) : trimmed;

        if (filterValue.startsWith('$date')) {
          const days = parseInt(filterValue.replace('$date', ''), 10) || 0;
          const targetDate = new Date(currentDate);
          targetDate.setDate(currentDate.getDate() - days);
          if (item.displayName === this.formatDate(targetDate)) {
            shouldInclude = !isExclusion;
            break;
          }
        } else if (this.matchPattern(filterValue, item.displayName)) {
          shouldInclude = !isExclusion;
          break;
        }
      }

      if (shouldInclude) {
        filteredData.push(item);
      }
    }

    return filteredData;
  }

  private calculateValue(values: number[], method: CalculationMethod): number {
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

  private matchPattern(pattern: string, target: string): boolean {
    if (pattern === target) {
      return true;
    }

    const regexSpecialChars = /[.*+?^${}()|[\]\\]/;
    if (regexSpecialChars.test(pattern)) {
      try {
        return new RegExp(pattern).test(target);
      } catch {
        return false;
      }
    }

    return false;
  }

  private getMetricColor(value: number, thresholds?: Threshold[], baseColor?: string) {
    let color = baseColor || '';
    let lvl = 1;

    thresholds?.forEach((t, index) => {
      if (t.condition && !this.evaluateCondition(t.condition)) {
        return;
      }

      const operator = t.operator || '>=';
      const compareResult = this.compareValues(value, t.value, operator);
      if (compareResult) {
        color = t.color;
        lvl = t.lvl || index + 1;
      }
    });

    if (color === baseColor) {
      lvl = 0;
    }
    return { color, lvl };
  }

  private evaluateCondition(condition: string): boolean {
    let result = false;
    try {
      const now = new Date();
      const timezone = parseInt(condition.match(/timezone\s*=\s*(-?\d+)/)?.[1] || '3', 10);
      const hour = (now.getUTCHours() + timezone + 24) % 24;
      const sanitizedCondition = condition.replace(/timezone\s*=\s*(-?\d+),?/, '').trim();

      const variableRegex =
        /\$([А-Яа-яЁёA-Za-z0-9_]+)(?:\.([А-Яа-яЁёA-Za-z0-9_ -]+))?(?::(last|total|max|min|count|delta))?/g;

      const metricsCondition = sanitizedCondition.replace(
        variableRegex,
        (_match: string, refId: string, subKey: string, calculationMethod: CalculationMethod = 'last') => {
          if (refId !== undefined) {
            refId = refId.trim();
            const metricData = this.extractedValueMap.get(refId);
            if (metricData) {
              let value = 0;
              if (subKey !== undefined) {
                subKey = subKey.trim();
                const subKeyValues = metricData.values.get(subKey);
                if (subKeyValues) {
                  const numericValues: number[] = subKeyValues.map(Number);
                  value = this.calculateValue(numericValues, calculationMethod);
                }
              } else {
                // Если subKey не указан, берем первое значение из метрики
                const firstValue = Array.from(metricData.values.values())[0];
                if (firstValue) {
                  const numericValues: number[] = firstValue.map(Number);
                  value = this.calculateValue(numericValues, calculationMethod);
                }
              }
              return value.toFixed(2);
            }
          }
          return '0';
        }
      );
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

  private formatDecimal(value: number, decimals = 3): number {
    return parseFloat(value.toFixed(decimals));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

import { Legends, Metric, RefIds, Threshold, ColorDataEntry } from './types';

type CalculationMethod = 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';

// Кэши для часто используемых вычислений
const calculationCache = new Map<string, number>();
const colorCache = new Map<string, { color: string; lvl: number }>();
const conditionCache = new Map<string, boolean>();

export class MetricProcessor {
  private static readonly DATE_FORMAT_CACHE = new Map<number, string>();
  private static readonly DECIMAL_CACHE = new Map<number, Map<number, number>>();

  constructor(
    private element: string,
    private metrics: Metric[],
    private extractedValueMap: Map<string, { values: Map<string, string[]> }>
  ) {}

  public process(): { color: ColorDataEntry[] } {
    const colorData: ColorDataEntry[] = [];
    if (!Array.isArray(this.metrics)) {
      return { color: [] };
    }

    // Оптимизация: предварительная обработка метрик
    for (let i = 0; i < this.metrics.length; i++) {
      const metric = this.metrics[i];
      this.processMetric(metric, colorData);
    }

    return { color: colorData };
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
      const cacheKey = `${innerKey}_${calculation}_${values.join(',')}`;

      if (calculationCache.has(cacheKey)) {
        items.push({
          displayName: innerKey,
          value: calculationCache.get(cacheKey)!,
        });
      } else {
        const value = this.calculateValue(values.map(Number), calculation);
        calculationCache.set(cacheKey, value);
        items.push({ displayName: innerKey, value });
      }
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
  }): void {
    const { value, label, refId, config, colorData, decimal, filling, thresholds, baseColor } = params;

    const colorKey = `${value}_${JSON.stringify(thresholds)}_${baseColor}`;
    let colorResult: { color: string; lvl: number };

    if (colorCache.has(colorKey)) {
      colorResult = colorCache.get(colorKey)!;
    } else {
      colorResult = this.getMetricColor(value, thresholds, baseColor);
      colorCache.set(colorKey, colorResult);
    }

    colorData.push({
      id: this.element,
      refId,
      label,
      color: colorResult.color,
      lvl: colorResult.lvl,
      metric: this.formatDecimal(value, decimal),
      filling: filling || '',
      unit: config.unit,
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

    const cacheKey = `${method}_${values.join(',')}`;
    if (calculationCache.has(cacheKey)) {
      return calculationCache.get(cacheKey)!;
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

    calculationCache.set(cacheKey, result);
    return result;
  }

  private matchPattern(pattern: string, target: string): boolean {
    if (pattern === target) {
      return true;
    }

    const cacheKey = `${pattern}_${target}`;
    if (conditionCache.has(cacheKey)) {
      return conditionCache.get(cacheKey)!;
    }

    const regexSpecialChars = /[.*+?^${}()|[\]\\]/;
    let result = false;

    if (regexSpecialChars.test(pattern)) {
      try {
        result = new RegExp(pattern).test(target);
      } catch {
        result = false;
      }
    }

    conditionCache.set(cacheKey, result);
    return result;
  }

  private getMetricColor(value: number, thresholds?: Threshold[], baseColor?: string) {
    let color = baseColor || '';
    let lvl = 1;

    if (thresholds?.length) {
      for (let i = 0; i < thresholds.length; i++) {
        const t = thresholds[i];
        if (t.condition && !this.evaluateCondition(t.condition)) {
          continue;
        }

        const operator = t.operator || '>=';
        if (this.compareValues(value, t.value, operator)) {
          color = t.color;
          lvl = t.lvl || i + 1;
          break; // Используем первый подходящий порог
        }
      }
    }

    if (color === baseColor) {
      lvl = 0;
    }
    return { color, lvl };
  }

  private evaluateCondition(condition: string): boolean {
    const cacheKey = condition;
    if (conditionCache.has(cacheKey)) {
      return conditionCache.get(cacheKey)!;
    }

    let result = false;
    try {
      const now = new Date();
      const timezone = parseInt(condition.match(/timezone\s*=\s*(-?\d+)/)?.[1] || '3', 10);
      const hour = (now.getUTCHours() + timezone + 24) % 24;

      result = new Function('hour', 'minute', 'day', `return ${condition}`)(hour, now.getUTCMinutes(), now.getUTCDay());
    } catch {
      result = false;
    }

    conditionCache.set(cacheKey, result);
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
    if (!MetricProcessor.DECIMAL_CACHE.has(decimals)) {
      MetricProcessor.DECIMAL_CACHE.set(decimals, new Map());
    }

    const decimalMap = MetricProcessor.DECIMAL_CACHE.get(decimals)!;
    if (decimalMap.has(value)) {
      return decimalMap.get(value)!;
    }

    const result = parseFloat(value.toFixed(decimals));
    decimalMap.set(value, result);
    return result;
  }

  private formatDate(date: Date): string {
    const time = date.getTime();
    if (MetricProcessor.DATE_FORMAT_CACHE.has(time)) {
      return MetricProcessor.DATE_FORMAT_CACHE.get(time)!;
    }

    const result = date.toISOString().split('T')[0];
    MetricProcessor.DATE_FORMAT_CACHE.set(time, result);
    return result;
  }
}

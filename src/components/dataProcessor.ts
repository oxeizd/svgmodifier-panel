import { Legends, Metric, RefIds, Threshold, ColorDataEntry } from './types';

type CalculationMethod = 'last' | 'total' | 'max' | 'min' | 'count' | 'delta';

export class MetricProcessor {
  constructor(
    private element: SVGElement,
    private metrics: Metric[],
    private extractedValueMap: Map<string, { values: Map<string, number[]> }>
  ) {}

  public process(): { color: ColorDataEntry[] } {
    const colorData: ColorDataEntry[] = [];
    if (!Array.isArray(this.metrics)) {
      return { color: [] };
    }

    this.metrics.forEach((metric) => {
      metric.refIds?.forEach((ref) => this.processRef(ref, metric, colorData));
      metric.legends?.forEach((legend) => this.processLegend(legend, metric, colorData));
    });
    return { color: colorData };
  }

  private processRef(ref: RefIds, metric: Metric, colorData: ColorDataEntry[]): void {
    if (!ref.refid) {
      return;
    }

    const globalKey = ref.refid;
    const metricData = this.extractedValueMap.get(globalKey);
    if (!metricData) {
      return;
    }

    const items = Array.from(metricData.values.entries()).map(([innerKey, values]) => ({
      displayName: innerKey,
      value: this.calculateValue(values.map(Number), ref.calculation || 'last'),
      globalKey,
    }));

    this.processItems({
      data: this.applyFilter(items, ref.filter),
      metric,
      config: ref,
      colorData,
      isLegend: false,
      parentKey: globalKey,
    });
  }

  private processLegend(legend: Legends, metric: Metric, colorData: ColorDataEntry[]): void {
    if (!legend.legend) {
      return;
    }

    // Собираем все внутренние ключи по всем глобальным ключам, соответствующие шаблону легенды
    const filteredItems = Array.from(this.extractedValueMap.entries()).flatMap(([globalKey, metricData]) => {
      return Array.from(metricData.values.entries())
        .filter(([innerKey]) => this.matchPattern(legend.legend, innerKey)) // Используем matchPattern
        .map(([innerKey, values]) => ({
          displayName: innerKey, // Используем внутренний ключ как идентификатор
          value: this.calculateValue(values.map(Number), legend.calculation || 'last'),
          globalKey,
        }));
    });

    // Применяем дополнительный фильтр если указан
    const filteredData = this.applyFilter(filteredItems, legend.filter);

    if (filteredData.length === 0) {
      return;
    }

    this.processItems({
      data: filteredData,
      metric,
      config: legend,
      colorData,
      isLegend: true,
    });
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
    const { thresholds, baseColor, displayText, decimal, filling } = metric;

    const sumMode = 'sum' in config && config.sum;

    if (sumMode) {
      if (data.length === 0) {
        return;
      } // Не создаем сумму если нет данных

      const sumValue = data.reduce((acc, item) => acc + item.value, 0);
      const metricColor = this.getMetricColor(sumValue, thresholds, baseColor);
      colorData.push({
        id: this.element.id,
        refId: isLegend ? config.sum! : parentKey || '',
        label: config.label || displayText || config.sum!,
        color: metricColor.color,
        lvl: metricColor.lvl,
        metric: this.formatDecimal(sumValue, decimal),
        filling: filling || '',
        unit: config.unit,
      });
    } else {
      data.forEach((item) => {
        const metricColor = this.getMetricColor(item.value, thresholds, baseColor);
        colorData.push({
          id: this.element.id,
          refId: isLegend ? item.displayName : parentKey || '',
          label: config.label || displayText || item.displayName,
          color: metricColor.color,
          lvl: metricColor.lvl,
          metric: this.formatDecimal(item.value, decimal),
          filling: filling || '',
          unit: config.unit,
        });
      });
    }
  }

  private applyFilter(
    data: Array<{ displayName: string; value: number }>,
    filter?: string
  ): Array<{ displayName: string; value: number }> {
    if (!filter) {
      return data;
    }
  
    const currentDate = new Date();
    return data.filter((item) => {
      const matchesFilter = filter.split(',').some((f) => {
        const trimmed = f.trim();
  
        // Проверяем на наличие префикса '-'
        const isExclusion = trimmed.startsWith('-');
        const filterValue = isExclusion ? trimmed.slice(1) : trimmed;
  
        if (filterValue.startsWith('$date')) {
          const days = parseInt(filterValue.replace('$date', ''), 10) || 0;
          const targetDate = new Date(currentDate);
          targetDate.setDate(currentDate.getDate() - days);
          return item.displayName === this.formatDate(targetDate);
        }
  
        const matches = this.matchPattern(filterValue, item.displayName);
        return isExclusion ? !matches : matches; // Исключаем или включаем в зависимости от префикса
      });
  
      return matchesFilter; // Возвращаем true, если элемент соответствует фильтру
    });
  }

  private calculateValue(values: number[], method: CalculationMethod): number {
    if (values.length === 0) {
      return 0;
    }

    switch (method) {
      case 'last':
        return values[values.length - 1];
      case 'total':
        return values.reduce((a, b) => a + b, 0);
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      case 'count':
        return values.length;
      case 'delta':
        return values[values.length - 1] - values[0];
      default:
        return values[values.length - 1];
    }
  }

  private matchPattern(pattern: string, target: string): boolean {
    // Проверяем, содержит ли pattern специальные символы регулярного выражения
    const regexSpecialChars = /[.*+?^${}()|[\]\\]/;

    if (regexSpecialChars.test(pattern)) {
      try {
        return new RegExp(pattern).test(target);
      } catch {
        return false; // Если регулярное выражение некорректно, возвращаем false
      }
    } else {
      return pattern === target; // Если специальных символов нет, выполняем точное совпадение
    }
  }

  private getMetricColor(value: number, thresholds?: Threshold[], baseColor?: string) {
    let color = baseColor || '';
    let lvl = 0;

    thresholds?.forEach((t, index) => {
      if (t.condition && !this.evaluateCondition(t.condition)) {
        return;
      }

      const operator = t.operator || '>=';
      const compareResult = this.compareValues(value, t.value, operator);

      if (compareResult) {
        color = t.color;
        lvl = index + 1;
        if (t.lvl) {
          lvl = t.lvl;
        }
      }
    });

    return { color, lvl };
  }

  private evaluateCondition(condition: string): boolean {
    try {
      const now = new Date();
      const timezone = parseInt(condition.match(/timezone\s*=\s*(-?\d+)/)?.[1] || '3', 10);
      const hour = (now.getUTCHours() + timezone + 24) % 24;

      return new Function('hour', 'minute', 'day', `return ${condition}`)(hour, now.getUTCMinutes(), now.getUTCDay());
    } catch {
      return false;
    }
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

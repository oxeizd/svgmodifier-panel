import { ColorDataEntry, LabelMapping } from '../types';

export class LabelUpdater {
  public static updateElements(
    elementsMap: Map<string, SVGElement>,
    label: string,
    labelColor?: string,
    colorData: ColorDataEntry[] = [],
    labelMapping?: LabelMapping[]
  ): void {
    // 1. Предварительная обработка данных о цветах
    const colorDataMap = this.createColorDataMap(colorData);

    // 2. Предварительная сортировка маппинга меток
    const sortedMappings = labelMapping ? this.sortLabelMappings(labelMapping) : undefined;

    // 3. Обработка каждого элемента
    for (const [id, element] of elementsMap) {
      if (!element) {
        continue;
      }

      // 4. Получение текстовых элементов
      const labelElements = this.getLabelElements(element);
      if (!labelElements.length) {
        continue;
      }

      // 5. Получение метрики для элемента
      const metricValue = this.getMetricValue(colorDataMap, id);

      // 6. Обновление содержимого подписи
      this.updateLabelContent(labelElements, label, metricValue, sortedMappings);

      // 7. Применение цвета подписи
      this.applyLabelColor(labelElements, labelColor, colorDataMap, id);
    }
  }

  private static createColorDataMap(colorData: ColorDataEntry[]): Map<string, ColorDataEntry[]> {
    const map = new Map<string, ColorDataEntry[]>();
    for (const entry of colorData) {
      if (!map.has(entry.id)) {
        map.set(entry.id, []);
      }
      map.get(entry.id)!.push(entry);
    }
    return map;
  }

  private static sortLabelMappings(mappings: LabelMapping[]): LabelMapping[] {
    return [...mappings].sort((a, b) => {
      const aValue = a.value ?? 0;
      const bValue = b.value ?? 0;

      const aIsAscending = a.condition && ['>', '>='].includes(a.condition);
      const bIsAscending = b.condition && ['>', '>='].includes(b.condition);

      if (aIsAscending !== bIsAscending) {
        return aIsAscending ? -1 : 1;
      }

      return aValue - bValue;
    });
  }

  private static getLabelElements(element: SVGElement): Array<SVGTextElement | HTMLElement> {
    const textElement = element.querySelector<SVGTextElement>('text');
    const htmlElement = element
      .querySelector<SVGForeignObjectElement>('foreignObject')
      ?.querySelector<HTMLElement>('div');

    return [textElement, htmlElement].filter(Boolean) as Array<SVGTextElement | HTMLElement>;
  }

  private static getMetricValue(colorDataMap: Map<string, ColorDataEntry[]>, elementId: string): number | undefined {
    const entries = colorDataMap.get(elementId);
    return entries?.length ? Math.max(...entries.map((entry) => entry.metric)) : undefined;
  }

  private static updateLabelContent(
    elements: Array<SVGTextElement | HTMLElement>,
    label: string,
    metricValue: number | undefined,
    mappings?: LabelMapping[]
  ): void {
    if (label !== 'replace') {
      elements.forEach((el) => (el.textContent = label));
      return;
    }

    if (metricValue === undefined) {
      elements.forEach((el) => (el.textContent = ''));
      return;
    }

    const content = mappings
      ? this.findMappedLabel(mappings, metricValue) ?? metricValue.toString()
      : metricValue.toString();

    elements.forEach((el) => (el.textContent = content));
  }

  private static findMappedLabel(mappings: LabelMapping[], value: number): string | undefined {
    for (let i = mappings.length - 1; i >= 0; i--) {
      const mapping = mappings[i];
      if (
        mapping.value !== undefined &&
        mapping.condition &&
        this.checkCondition(value, mapping.value, mapping.condition)
      ) {
        return mapping.label;
      }
    }
    return undefined;
  }

  private static checkCondition(value: number, conditionValue: number, condition: string): boolean {
    switch (condition) {
      case '>':
        return value > conditionValue;
      case '<':
        return value < conditionValue;
      case '=':
        return value === conditionValue;
      case '>=':
        return value >= conditionValue;
      case '<=':
        return value <= conditionValue;
      case '!=':
        return value !== conditionValue;
      default:
        return false;
    }
  }

  private static applyLabelColor(
    elements: Array<SVGTextElement | HTMLElement>,
    colorSetting: string | undefined,
    colorDataMap: Map<string, ColorDataEntry[]>,
    elementId: string
  ): void {
    if (!colorSetting) {
      return;
    }

    const entries = colorDataMap.get(elementId);
    if (!entries?.length) {
      return;
    }

    let color: string;
    if (colorSetting === 'metric') {
      // Находим запись с максимальным значением метрики
      const maxEntry = entries.reduce((max, current) => (current.metric > max.metric ? current : max));
      color = maxEntry.color;
    } else {
      color = colorSetting;
    }

    elements.forEach((el) => {
      if (el instanceof SVGTextElement) {
        el.setAttribute('fill', color);
      } else {
        (el as HTMLElement).style.color = color;
      }
    });
  }
}

import { ColorDataEntry, LabelMapping } from '../types';

export class LabelUpdater {
  public static updateElements(
    elementsMap: Map<string, SVGElement>,
    label: string,
    labelColor?: string,
    colorData: ColorDataEntry[] = [],
    labelMapping?: LabelMapping[]
  ): void {
    const colorDataMap = this.buildColorDataMap(colorData);
    const sortedMappings = labelMapping ? this.prepareMappings(labelMapping) : undefined;

    for (const [id, element] of elementsMap) {
      if (!element) {
        continue;
      }

      const labelElements = this.findLabelElements(element);
      if (!labelElements.length) {
        continue;
      }

      const metricValue = this.calculateMaxMetric(colorDataMap, id);
      this.processLabelContent(labelElements, label, metricValue, sortedMappings);
      this.applyColorToLabels(labelElements, labelColor, colorDataMap, id);
    }
  }

  private static buildColorDataMap(colorData: ColorDataEntry[]): Map<string, ColorDataEntry[]> {
    const map = new Map<string, ColorDataEntry[]>();

    for (const entry of colorData) {
      const entries = map.get(entry.id) || [];
      entries.push(entry);
      map.set(entry.id, entries);
    }

    return map;
  }

  private static prepareMappings(mappings: LabelMapping[]): LabelMapping[] {
    return [...mappings].sort((a, b) => {
      const aVal = a.value ?? 0;
      const bVal = b.value ?? 0;
      const aIsHighPriority = a.condition && ['>', '>='].includes(a.condition);
      const bIsHighPriority = b.condition && ['>', '>='].includes(b.condition);

      return aIsHighPriority === bIsHighPriority ? aVal - bVal : aIsHighPriority ? -1 : 1;
    });
  }

  private static findLabelElements(element: SVGElement): Array<SVGTextElement | HTMLElement> {
    const elements: Array<SVGTextElement | HTMLElement> = [];

    const textElement = element.querySelector('text');
    if (textElement) {
      elements.push(textElement);
    }

    const htmlElement = element.querySelector('foreignObject')?.querySelector('div');
    if (htmlElement) {
      elements.push(htmlElement);
    }

    return elements;
  }

  private static calculateMaxMetric(
    colorDataMap: Map<string, ColorDataEntry[]>,
    elementId: string
  ): number | undefined {
    const entries = colorDataMap.get(elementId);
    if (!entries?.length) {
      return undefined;
    }

    let maxMetric = entries[0].metric;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].metric > maxMetric) {
        maxMetric = entries[i].metric;
      }
    }
    return maxMetric;
  }

  private static processLabelContent(
    elements: Array<SVGTextElement | HTMLElement>,
    label: string,
    metricValue: number | undefined,
    mappings?: LabelMapping[]
  ): void {
    if (label !== 'replace') {
      this.setElementsText(elements, label);
      return;
    }

    const content =
      metricValue === undefined ? '' : this.getMappedLabel(mappings, metricValue) ?? metricValue.toString();

    this.setElementsText(elements, content);
  }

  private static setElementsText(elements: Array<SVGTextElement | HTMLElement>, text: string): void {
    for (const el of elements) {
      el.textContent = text;
    }
  }

  private static getMappedLabel(mappings: LabelMapping[] | undefined, value: number): string | undefined {
    if (!mappings) {
      return undefined;
    }

    for (let i = mappings.length - 1; i >= 0; i--) {
      const mapping = mappings[i];
      if (
        mapping.value !== undefined &&
        mapping.condition &&
        this.evaluateCondition(value, mapping.value, mapping.condition)
      ) {
        return mapping.label;
      }
    }
    return undefined;
  }

  private static evaluateCondition(value: number, conditionValue: number, condition: string): boolean {
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

  private static applyColorToLabels(
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

    const color = colorSetting === 'metric' ? this.findMaxMetricEntry(entries).color : colorSetting;

    for (const el of elements) {
      if (el instanceof SVGTextElement) {
        el.setAttribute('fill', color);
      } else {
        (el as HTMLElement).style.color = color;
      }
    }
  }

  private static findMaxMetricEntry(entries: ColorDataEntry[]): ColorDataEntry {
    let maxEntry = entries[0];
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].metric > maxEntry.metric) {
        maxEntry = entries[i];
      }
    }
    return maxEntry;
  }
}

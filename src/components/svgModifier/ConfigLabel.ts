import { ColorDataEntry, LabelMapping } from '../types';

export class LabelUpdater {
  public static updateElements(
    elementsMap: Map<string, SVGElement>,
    label?: string,
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

      if (label !== undefined || sortedMappings) {
        this.processLabelContent(labelElements, label || 'replace', metricValue, sortedMappings);
      }

      if (labelColor !== undefined) {
        this.applyColorToLabels(labelElements, labelColor, colorDataMap, id);
      }
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
    const originalStyles = elements.map((el) => {
      if (el instanceof SVGTextElement) {
        return {
          element: el,
          fontSize: el.getAttribute('font-size'),
          fill: el.getAttribute('fill'),
          stroke: el.getAttribute('stroke'),
          color: null,
        };
      } else {
        return {
          element: el,
          fontSize: (el as HTMLElement).style.fontSize,
          fill: null,
          stroke: null,
          color: (el as HTMLElement).style.color,
        };
      }
    });

    for (const el of elements) {
      el.textContent = text;
    }

    for (const style of originalStyles) {
      if (style.element instanceof SVGTextElement) {
        if (style.fontSize) {
          style.element.setAttribute('font-size', style.fontSize);
        }
        if (style.fill) {
          style.element.setAttribute('fill', style.fill);
        }
        if (style.stroke) {
          style.element.setAttribute('stroke', style.stroke);
        }
      } else {
        if (style.fontSize) {
          (style.element as HTMLElement).style.fontSize = style.fontSize;
        }
        if (style.color) {
          (style.element as HTMLElement).style.color = style.color;
        }
      }
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

    let color: string;

    if (colorSetting === 'metric') {
      const entries = colorDataMap.get(elementId);
      if (!entries?.length) {
        return;
      }
      color = this.findMaxMetricEntry(entries).color;
    } else {
      color = colorSetting;
    }

    for (const el of elements) {
      if (!el || !el.isConnected) {
        continue;
      }

      if (el instanceof SVGTextElement) {
        el.setAttribute('fill', color);

        const nestedTexts = el.querySelectorAll('text');
        nestedTexts.forEach((textEl) => {
          textEl.setAttribute('fill', color);
          textEl.removeAttribute('stroke');
        });
      } else if (el instanceof HTMLElement) {
        el.style.color = color;

        const colorElements = el.querySelectorAll('[style*="color"], [fill]');
        colorElements.forEach((colorEl) => {
          if (colorEl instanceof SVGElement && colorEl.hasAttribute('fill')) {
            colorEl.setAttribute('fill', color);
          }
          if (colorEl instanceof HTMLElement) {
            colorEl.style.color = color;
          }
        });
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

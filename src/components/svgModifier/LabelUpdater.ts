import type { ColorDataEntry } from '../types';

export class LabelUpdater {
  public static updateElements(
    elementsMap: Map<string, SVGElement>,
    label: string,
    labelColor?: string,
    colorData: ColorDataEntry[] = [],
    labelMapping?: any[]
  ): void {
    for (const [id, element] of elementsMap.entries()) {
      if (!element) {
        continue;
      }

      const labelElements = this.getLabelElements(element);
      if (!labelElements.length) {
        continue;
      }

      const metricValue = this.getMetricValue(colorData, id);
      this.updateLabelContent(labelElements, label, metricValue, labelMapping);
      this.applyLabelColor(labelElements, labelColor, colorData, id);
    }
  }

  private static getLabelElements(element: SVGElement): Array<SVGTextElement | HTMLElement> {
    const textElement = element.querySelector<SVGTextElement>('text');
    const htmlElement = element
      .querySelector<SVGForeignObjectElement>('foreignObject')
      ?.querySelector<HTMLElement>('div');

    return [textElement, htmlElement].filter(Boolean) as Array<SVGTextElement | HTMLElement>;
  }

  private static getMetricValue(colorData: ColorDataEntry[], elementId: string): number | undefined {
    const entriesForId = colorData.filter((entry) => entry.id === elementId);
    return entriesForId.length ? Math.max(...entriesForId.map((entry) => entry.metric)) : undefined;
  }

  private static updateLabelContent(
    elements: Array<SVGTextElement | HTMLElement>,
    label: string,
    metricValue: number | undefined,
    mappings: any[] | undefined
  ): void {
    if (label !== 'replace') {
      elements.forEach((el) => (el.textContent = label));
      return;
    }

    if (metricValue === undefined) {
      elements.forEach((el) => (el.textContent = ''));
      return;
    }

    const mappedLabel = this.getMappedLabel(mappings, metricValue);
    const content = mappedLabel !== undefined ? mappedLabel : metricValue.toString();

    elements.forEach((el) => (el.textContent = content));
  }

  // Возвращает метку на основе маппинга и значения.
  private static getMappedLabel(mappings: any[] | undefined, value: number): string | undefined {
    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return undefined;
    }

    const applicableMappings = mappings.filter(
      (m) => m && m.value !== undefined && m.condition && this.checkCondition(value, m.value, m.condition)
    );

    if (applicableMappings.length === 0) {
      return undefined;
    }

    const bestMapping = applicableMappings.reduce(
      (best, current) => (this.isBetterMatch(current, best, value) ? current : best),
      applicableMappings[0]
    );

    return bestMapping.label;
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

  private static isBetterMatch(current: any, best: any, value: number): boolean {
    if (!best) {
      return true;
    }

    const [currentVal, bestVal] = [current.value, best.value];
    const isCurrentAscending = ['>', '>='].includes(current.condition);
    const isBestAscending = ['>', '>='].includes(best.condition);

    if (isCurrentAscending && isBestAscending) {
      return currentVal > bestVal; // Высокий порог лучше для возрастающих условий
    } else if (!isCurrentAscending && !isBestAscending) {
      return currentVal < bestVal; // Низкий порог лучше для убывающих условий
    } else {
      const currentDiff = isCurrentAscending ? value - currentVal : currentVal - value;
      const bestDiff = isBestAscending ? value - bestVal : bestVal - value;
      return currentDiff < bestDiff;
    }
  }

  private static applyLabelColor(
    elements: Array<SVGTextElement | HTMLElement>,
    colorSetting: string | undefined,
    colorData: ColorDataEntry[],
    elementId: string
  ): void {
    if (!colorSetting) {
      return;
    }

    const relevantEntries = colorData.filter((entry) => entry.id === elementId);
    if (!relevantEntries.length) {
      return;
    }

    const color =
      colorSetting === 'metric'
        ? relevantEntries.reduce((maxEntry, current) => (current.metric > maxEntry.metric ? current : maxEntry)).color
        : colorSetting;

    elements.forEach((el) => {
      if (el instanceof SVGTextElement) {
        el.setAttribute('fill', color);
      } else {
        (el as HTMLElement).style.color = color;
      }
    });
  }
}

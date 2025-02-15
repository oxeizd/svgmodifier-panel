import { Change, ColorDataEntry } from './types';
import { LinkManager } from './linkManager';
import { MetricProcessor } from './dataProcessor';
import { DataExtractor } from './dataExtractor';
import { formatValues } from './formatter';

type TooltipItem = {
  id: string;
  label: string;
  color: string;
  metric: string;
};

type tooltipChanges = {
  id: string;
  show: boolean;
};

export class SvgModifier {
  constructor(private svg: string, private changes: Change[], private dataFrame: any[]) {}

  public modify(): { modifiedSvg: string; tooltipData: TooltipItem[] } {
    const doc = this.parseSvgDocument();
    const tooltipData: TooltipItem[] = [];
    const colorData: ColorDataEntry[] = [];
    const tooltipChanges: tooltipChanges[] = [];
    this.initializeSvgElement(doc);
    this.processAllChanges(doc, colorData, tooltipChanges);
    this.applyColorData(doc, colorData);
    this.processTooltipData(colorData, tooltipData, tooltipChanges);

    return {
      modifiedSvg: new XMLSerializer().serializeToString(doc.documentElement),
      tooltipData,
    };
  }

  private parseSvgDocument(): Document {
    const parser = new DOMParser();
    return parser.parseFromString(this.svg, 'image/svg+xml');
  }

  private initializeSvgElement(doc: Document): void {
    const svgElement = doc.documentElement;
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');

    if (!svgElement.hasAttribute('viewBox')) {
      svgElement.setAttribute('viewBox', '0 0 100 100');
    }
  }

  private processAllChanges(doc: Document, colorData: ColorDataEntry[], tooltipChanges: tooltipChanges[]): void {
    const dataExtractor = new DataExtractor(this.dataFrame);
    const extractedValueMap = dataExtractor.extractValues();

    this.changes.forEach((change) => this.processChange(change, doc, extractedValueMap, colorData, tooltipChanges));
  }

  private processChange(
    change: Change,
    doc: Document,
    extractedValueMap: Map<string, any>,
    colorData: ColorDataEntry[],
    tooltipChanges: tooltipChanges[]
  ): void {
    const { id, attributes } = change;
    const ids = Array.isArray(id) ? id : [id];
    const elements = this.findElementsByIdOrRegex(ids, doc);

    if (elements.length === 0) {
      return;
    }

    const elementIds = this.extractUniqueElementIds(elements);
    this.processMetrics(
      elements[0],
      attributes?.metrics,
      extractedValueMap,
      colorData,
      elementIds,
      attributes?.autoConfig
    );

    elements.forEach((element) => {
      if (attributes?.link) {
        LinkManager.addLinkToElement(element, attributes.link);
      }
      if (attributes?.label) {
        this.updateElementLabel(element, attributes.label, attributes.labelColor, colorData);
      }
      if (attributes?.tooltip) {
        tooltipChanges.push({
          id: element.id,
          show: true,
        });
      }
    });
  }

  private extractUniqueElementIds(elements: SVGElement[]): string[] {
    return [...new Set(elements.filter((element) => element.id).map((element) => element.id))];
  }

  private findElementsByIdOrRegex(ids: string[], doc: Document): SVGElement[] {
    const elementSet = new Set<SVGElement>();

    ids.forEach((id) => {
      if (this.isValidRegex(id)) {
        this.addElementsMatchingRegex(id, doc, elementSet);
      } else {
        this.addElementById(id, doc, elementSet);
      }
    });

    return Array.from(elementSet);
  }

  private isValidRegex(pattern: string): boolean {
    try {
      new RegExp(pattern);
      return /[.*+?^${}()|[\]\\]/.test(pattern);
    } catch {
      return false;
    }
  }

  private addElementsMatchingRegex(pattern: string, doc: Document, set: Set<SVGElement>): void {
    const regex = new RegExp(pattern);
    const elements = doc.getElementsByTagName('*');

    Array.from(elements).forEach((element) => {
      const svgElement = element as unknown as SVGElement;
      if (regex.test(svgElement.id) && !set.has(svgElement)) {
        set.add(svgElement);
      }
    });
  }

  private addElementById(id: string, doc: Document, set: Set<SVGElement>): void {
    const element = doc.getElementById(id);
    if (element) {
      set.add(element as unknown as SVGElement);
    }
  }

  private processMetrics(
    element: SVGElement,
    metrics: any[] | undefined,
    extractedValueMap: Map<string, any>,
    colorData: ColorDataEntry[],
    ids: string[],
    autoConfig?: boolean
  ): void {
    if (!metrics?.length) {
      return;
    }

    const processor = new MetricProcessor(element, metrics, extractedValueMap);
    const processedData = processor.process();

    autoConfig
      ? this.handleAutoConfig(colorData, ids, processedData)
      : this.handleDefaultConfig(colorData, processedData, ids);
  }

  private handleAutoConfig(colorData: ColorDataEntry[], ids: string[], processedData: any): void {
    const minLength = Math.min(ids.length, processedData.color.length);

    processedData.color
      .slice(0, minLength)
      .forEach((entry: any, index: number) => colorData.push({ ...entry, id: ids[index] }));

    if (processedData.color.length > ids.length) {
      const lastId = ids[ids.length - 1];
      processedData.color.slice(minLength).forEach((entry: any) => colorData.push({ ...entry, id: lastId }));
    }
  }

  private handleDefaultConfig(colorData: ColorDataEntry[], processedData: any, ids: string[]): void {
    processedData.color.forEach((entry: any) => colorData.push(entry));

    if (ids.length > 1) {
      this.replicateColorDataForIds(colorData, ids);
    }
  }

  private replicateColorDataForIds(colorData: ColorDataEntry[], ids: string[]): void {
    const baseEntries = colorData.filter((entry) => entry.id === ids[0]);

    baseEntries.forEach((baseEntry) => {
      ids.slice(1).forEach((id) => colorData.push({ ...baseEntry, id }));
    });
  }

  private updateElementLabel(
    element: SVGElement,
    label: string,
    labelColor?: string,
    colorData: ColorDataEntry[] = []
  ): void {
    const labelElements = this.getLabelElements(element);
    if (!labelElements.length) {
      return;
    }

    const metricValue = this.getMetricValue(colorData, element.id);
    this.updateLabelContent(labelElements, label, metricValue, element.id);
    this.applyLabelColor(labelElements, labelColor, colorData, element.id);
  }

  private getLabelElements(element: SVGElement): Array<SVGTextElement | HTMLElement> {
    return [element.querySelector('text'), element.querySelector('foreignObject')?.querySelector('div')].filter(
      Boolean
    ) as Array<SVGTextElement | HTMLElement>;
  }

  private getMetricValue(colorData: ColorDataEntry[], elementId: string): number | undefined {
    const entriesForId = colorData.filter((entry) => entry.id === elementId);
    if (entriesForId.length === 0) {
      return undefined;
    }
    return entriesForId.reduce((max, entry) => (entry.metric > max ? entry.metric : max), -Infinity);
  }

  private updateLabelContent(
    elements: Array<SVGTextElement | HTMLElement>,
    label: string,
    metricValue: number | undefined,
    elementId: string
  ): void {
    const mappings = this.getLabelMappings(elementId);
    const content =
      label === 'replace' && metricValue !== undefined
        ? this.getMappedLabel(mappings, metricValue) ?? metricValue.toString()
        : label;

    elements.forEach((el) => (el.textContent = content));
  }

  private getLabelMappings(elementId: string): any[] | undefined {
    return this.changes.find((change) => (Array.isArray(change.id) ? change.id : [change.id]).includes(elementId))
      ?.attributes?.labelMapping;
  }

  private getMappedLabel(mappings: any[] | undefined, value: number): string | undefined {
    if (!mappings?.length) {
      return undefined;
    }

    const applicableMappings = mappings.filter((m) => this.checkCondition(value, m.value, m.condition));

    if (!applicableMappings.length) {
      return undefined;
    }

    return applicableMappings.reduce((best, current) => (this.isBetterMatch(current, best, value) ? current : best))
      .label;
  }

  private checkCondition(value: number, conditionValue: number, condition: string): boolean {
    // Используем хеш-таблицу для быстрого доступа к условиям
    const conditionHandlers: { [key: string]: boolean } = {
      '>': value > conditionValue,
      '<': value < conditionValue,
      '=': value === conditionValue,
      '>=': value >= conditionValue,
      '<=': value <= conditionValue,
      '!=': value !== conditionValue,
    };

    return conditionHandlers[condition] ?? false;
  }

  private isBetterMatch(current: any, best: any, value: number): boolean {
    if (!best?.condition) {
      return true;
    }

    const [currentVal, bestVal] = [current.value, best.value];
    const isCurrentAscending = ['>', '>='].includes(current.condition);
    const isBestAscending = ['>', '>='].includes(best.condition);

    return (
      (isCurrentAscending && currentVal > bestVal) ||
      (!isCurrentAscending && currentVal < bestVal) ||
      (isCurrentAscending === isBestAscending &&
        ((isCurrentAscending && currentVal > bestVal) || (!isCurrentAscending && currentVal < bestVal)))
    );
  }

  private applyLabelColor(
    elements: Array<SVGTextElement | HTMLElement>,
    colorSetting: string | undefined,
    colorData: ColorDataEntry[],
    elementId: string // Новый параметр для фильтрации данных
  ): void {
    if (!colorSetting) {
      return;
    }

    const relevantEntries = colorData.filter((entry) => entry.id === elementId);
    if (relevantEntries.length === 0) {
      return;
    }

    let color = colorSetting;
    if (color === 'metric') {
      const maxEntry = relevantEntries.reduce(
        (maxEntry, current) => (current.metric > maxEntry.metric ? current : maxEntry),
        relevantEntries[0]
      );
      color = maxEntry.color;
    }

    elements.forEach((el) => {
      if (el instanceof SVGTextElement) {
        el.setAttribute('fill', color);
      } else {
        (el as HTMLElement).style.color = color;
      }
    });
  }

  private applyColorData(doc: Document, colorData: ColorDataEntry[]): void {
    const colorMap = this.createColorMap(colorData);
    const bestEntries: ColorDataEntry[] = []; // Создаем массив для хранения лучших записей

    // Группируем записи по id
    const groupedEntries: { [key: string]: ColorDataEntry[] } = {};
    colorMap.forEach((entries, id) => {
      groupedEntries[id] = entries;
    });

    // Находим лучшую запись для каждого id
    for (const id in groupedEntries) {
      const entries = groupedEntries[id];
      const bestEntry = this.findBestColorEntry(entries);
      if (bestEntry) {
        bestEntries.push(bestEntry);
        const element = doc.getElementById(id);
        if (element) {
          this.applyEntryStyles(element, bestEntry);
        }
      }
    }
  }

  private createColorMap(colorData: ColorDataEntry[]): Map<string, ColorDataEntry[]> {
    return colorData.reduce((map, entry) => {
      if (!map.has(entry.id)) {
        map.set(entry.id, []);
      }
      map.get(entry.id)!.push(entry);
      return map;
    }, new Map<string, ColorDataEntry[]>());
  }

  private findBestColorEntry(entries: ColorDataEntry[]): ColorDataEntry {
    return entries.reduce((best, current) => {
      if (current.lvl !== undefined && best.lvl !== undefined) {
        return current.lvl > best.lvl || (current.lvl === best.lvl && current.metric > best.metric) ? current : best;
      }
      return current.metric > best.metric ? current : best;
    }, entries[0]);
  }

  private applyEntryStyles(element: Element, entry: ColorDataEntry): void {
    if (!entry.color) {
      return;
    }

    const styleableElements = element.querySelectorAll<SVGElement>('[fill], [stroke]');

    styleableElements.forEach((el) => {
      const parentGroup = el.closest('g');
      if (el.tagName === 'text' || parentGroup?.querySelector('text')) {
        return;
      }

      const defStyle = el.getAttribute('style');
      const strokeValue = el.getAttribute('stroke');
      el.removeAttribute('style');

      if (entry.filling) {
        const fillingParts = entry.filling.split(',').map((s) => s.trim());
        const fillingType = fillingParts[0];
        const opacity = fillingParts.length > 1 ? parseInt(fillingParts[1], 10) : undefined;

        // Проверяем, что opacity является числом и находится в диапазоне от 0 до 100
        if (opacity !== undefined && !isNaN(opacity) && opacity >= 0 && opacity <= 100) {
          const alpha = opacity / 100;

          // Устанавливаем opacity для элемента
          el.setAttribute('opacity', alpha.toString());
        }

        // Устанавливаем цвет в зависимости от типа заливки
        if (fillingType === 'fill') {
          el.setAttribute('fill', entry.color);
        } else if (fillingType === 'stroke') {
          el.setAttribute('stroke', entry.color);
        } else if (fillingType === 'none') {
          if (defStyle) {
            el.setAttribute('style', defStyle);
          }
          return;
        } else if (fillingType === 'fs') {
          el.setAttribute('fill', entry.color);
          el.setAttribute('stroke', entry.color);
        } else {
          if (defStyle) {
            el.setAttribute('style', defStyle);
          }
        }
      } else {
        if (strokeValue !== 'none') {
          el.setAttribute('stroke', entry.color);
        }
        el.setAttribute('fill', entry.color);
      }
    });
  }

  private processTooltipData(
    colorData: ColorDataEntry[],
    tooltipData: TooltipItem[],
    tooltipChanges: tooltipChanges[]
  ): void {
    colorData
      .filter(({ id }) => tooltipChanges.some((tc) => tc.id === id && tc.show))
      .forEach(({ id, label, color, metric, unit }) => {
        // Удаляем приписки вида _prfxN из label
        const cleanedLabel = label.replace(/_prfx\d+/g, '');

        tooltipData.push({
          id,
          label: cleanedLabel,
          color,
          metric: unit ? formatValues(metric, unit) : metric.toString(),
        });
      });
  }
}

import { Change, ColorDataEntry } from './types';
import { LinkManager } from './linkManager';
import { MetricProcessor } from './dataProcessor';
import { DataExtractor } from './dataExtractor';
import { formatValues } from './formatter';

export class SvgModifier {
  private svg: string;
  private changes: Change[];
  private dataFrame: any[];

  constructor(svg: string, changes: Change[], dataFrame: any[]) {
    this.svg = svg;
    this.changes = changes;
    this.dataFrame = dataFrame;
  }

  public modify(): {
    modifiedSvg: string;
    tooltipData: Array<{ id: string; label: string; color: string; metric: string }>;
  } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.svg, 'image/svg+xml');
    const tooltipData: Array<{ id: string; label: string; color: string; metric: string }> = [];
    const colorData: ColorDataEntry[] = [];

    const dataExtractor = new DataExtractor(this.dataFrame);
    const extractedValueMap = dataExtractor.extractValues();

    const svgElement = doc.documentElement;
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');
    if (!svgElement.hasAttribute('viewBox')) {
      svgElement.setAttribute('viewBox', '0 0 100 100');
    }

    this.changes.forEach((change) => this.processChange(change, doc, extractedValueMap, colorData, tooltipData));

    this.applyColorData(doc, colorData);

    return { modifiedSvg: new XMLSerializer().serializeToString(doc.documentElement), tooltipData };
  }

  private processChange(
    change: Change,
    doc: Document,
    extractedValueMap: any,
    colorData: ColorDataEntry[],
    tooltipData: any[]
  ) {
    const { id, attributes } = change;
    const { tooltip, metrics, link, label, labelColor, autoConfig } = attributes || {};
    const ids = Array.isArray(id) ? id : [id];
    const elements = this.findElementsByIdOrRegex(ids, doc);

    if (elements.length === 0) {
      return;
    }

    const filteredIdsSet = new Set<string>();

    elements.forEach((element) => {
      if (element instanceof SVGElement && element.id) {
        filteredIdsSet.add(element.id);
      }
    });

    const filteredIds = Array.from(filteredIdsSet);

    // Обрабатываем метрики только для первого элемента
    const firstElement = elements[0];
    if (metrics && Array.isArray(metrics)) {
      this.processMetrics(firstElement, metrics, extractedValueMap, colorData, filteredIds, autoConfig);
    }

    elements.forEach((element) => {
      if (link) {
        LinkManager.addLinkToElement(element, link);
      }

      try {
        if (label) {
          this.updateLabel(element, label, labelColor, colorData);
        }
      } catch {}

      if (tooltip) {
        this.processTooltip(tooltip, element.id, colorData, tooltipData);
      }
    });
  }

  private findElementsByIdOrRegex(ids: string[], doc: Document): SVGElement[] {
    const matchingElements: SVGElement[] = [];

    ids.forEach((id) => {
      if (this.isValidRegex(id)) {
        // Если идентификатор является регулярным выражением, ищем совпадения
        const allElements = doc.getElementsByTagName('*');
        for (const el of allElements) {
          if (this.matchRegex(id, el.id)) {
            matchingElements.push(el as unknown as SVGElement);
          }
        }
      } else {
        // Если идентификатор не является регулярным выражением, ищем по точному совпадению
        const element = doc.getElementById(id);
        if (element) {
          matchingElements.push(element as unknown as SVGElement);
        }
      }
    });

    return matchingElements;
  }

  private processMetrics(
    element: SVGElement,
    metrics: any[],
    extractedValueMap: any,
    colorData: ColorDataEntry[],
    ids: string[],
    autoConfig?: boolean
  ) {
    const metricProcessor = new MetricProcessor(element, metrics, extractedValueMap);
    const processedColorData = metricProcessor.process();

    if (!processedColorData.color || processedColorData.color.length === 0) {
      return; // Возвращаем, если нет данных
    }

    if (autoConfig && ids.length > 1) {
      const minLength = Math.min(ids.length, processedColorData.color.length);

      // Применяем данные к colorData
      for (let i = 0; i < minLength; i++) {
        const { refId, label, color, metric, filling, unit } = processedColorData.color[i];
        colorData.push({ id: ids[i], refId, label, color, metric, filling, unit });
      }

      // Если есть оставшиеся colorData, применяем их к последнему id, для которого есть метрики
      if (processedColorData.color.length > ids.length) {
        const remainingColors = processedColorData.color.slice(minLength);
        const lastId = ids[ids.length - 1];

        remainingColors.forEach(({ refId, label, color, metric, filling, unit }) => {
          colorData.push({ id: lastId, refId, label, color, metric, filling, unit });
        });
      }
    } else {
      // Добавляем данные цвета в colorData
      processedColorData.color.forEach(({ id, refId, label, color, metric, filling, unit }) => {
        colorData.push({ id, refId, label, color, metric, filling, unit });
      });

      if (ids.length > 1) {
        this.copyColorDataToOtherIds(ids, colorData);
      }
    }
  }

  private copyColorDataToOtherIds(ids: string[], colorData: ColorDataEntry[]) {
    const firstId = ids[0];
    const firstColorData = colorData.filter((data) => data.id === firstId);
    if (firstColorData.length > 0) {
      // Перебираем все элементы, соответствующие firstId
      firstColorData.forEach((firstColorEntry) => {
        ids.slice(1).forEach((singleId) => {
          colorData.push({
            id: singleId,
            refId: firstColorEntry.refId,
            label: firstColorEntry.label,
            color: firstColorEntry.color,
            metric: firstColorEntry.metric,
            filling: firstColorEntry.filling,
            unit: firstColorEntry.unit,
          });
        });
      });
    }
    
  }

  private updateLabel(element: SVGElement, label: string, labelColor: string | undefined, colorData: ColorDataEntry[]) {
    const metricValues = colorData.map((entry) => entry.metric);
    const metricValue = metricValues.length > 0 ? Math.max(...metricValues) : undefined;

    const elementsToUpdate = [
      element.querySelector<SVGTextElement>('text'),
      element.querySelector<SVGForeignObjectElement>('foreignObject')?.querySelector('div'),
    ].filter(Boolean);

    elementsToUpdate.forEach((el) => {
      if (el) {
        if (label === 'replace' && metricValue !== undefined) {
          const labelMapping = this.getLabelMappingForChange(element.id);
          if (labelMapping) {
            const newLabel = this.getLabelFromMapping(labelMapping, metricValue);
            el.textContent = newLabel !== undefined ? newLabel : String(metricValue);
          } else {
            el.textContent = String(metricValue);
          }
        } else {
          el.textContent = label;
        }

        if (labelColor) {
          let colorToUse: string | undefined;

          if (labelColor === 'metric') {
            const maxColorEntry = colorData.reduce(
              (max, entry) => (entry.metric > max.metric ? entry : max),
              colorData[0]
            );
            colorToUse = maxColorEntry.color;
          } else {
            colorToUse = labelColor;
          }

          if (colorToUse) {
            if (el instanceof SVGTextElement) {
              el.setAttribute('fill', colorToUse);
            } else if (el instanceof HTMLElement) {
              el.style.color = colorToUse;
            }
          }
        }
      }
    });
  }

  private getLabelMappingForChange(id: string): Array<{ condition: string; value: number; label: string }> | undefined {
    const change = this.changes.find((change) => {
      const ids = Array.isArray(change.id) ? change.id : [change.id];
      return ids.includes(id);
    });
    return change?.attributes.labelMapping;
  }

  private getLabelFromMapping(
    labelMapping: Array<{ condition: string; value: number; label: string }>,
    metricValue: number
  ): string | undefined {
    let bestMatch: { condition: string; value: number; label: string } | undefined;

    for (const mapping of labelMapping) {
      const { condition, value, label } = mapping;
      let conditionMet = false;

      if (condition === '>') {
        conditionMet = metricValue > value;
      } else if (condition === '<') {
        conditionMet = metricValue < value;
      } else if (condition === '=') {
        conditionMet = metricValue === value;
        if (conditionMet) {
          return label;
        }
      } else if (condition === '>=') {
        conditionMet = metricValue >= value;
      } else if (condition === '<=') {
        conditionMet = metricValue <= value;
      } else if (condition === '!=') {
        conditionMet = metricValue !== value;
      } else {
        continue;
      }

      if (conditionMet) {
        if (
          !bestMatch ||
          (condition === '>' || condition === '>='
            ? value > (bestMatch.value ?? -Infinity)
            : value < (bestMatch.value ?? Infinity))
        ) {
          bestMatch = mapping;
        }
      }
    }

    return bestMatch ? bestMatch.label : undefined;
  }

  private applyColorData(doc: Document, colorData: ColorDataEntry[]) {
    const colorMap = new Map<string, Array<{ color: string; metric: number; filling?: string }>>();

    colorData.forEach(({ id, color, metric, filling }) => {
      if (!colorMap.has(id)) {
        colorMap.set(id, []);
      }
      colorMap.get(id)!.push({ color, metric, filling });
    });

    colorMap.forEach((colors, id) => {
      const element = doc.getElementById(id);
      if (element) {
        const validColors = colors.filter((entry) => entry.color !== '');

        if (validColors.length > 0) {
          const maxColorEntry = validColors.reduce(
            (max, entry) => (entry.metric > max.metric ? entry : max),
            validColors[0]
          );
          const fillingValue = maxColorEntry.filling;

          const elements = element.querySelectorAll<SVGElement>('[fill], [stroke]');
          if (maxColorEntry.color !== '') {
            elements.forEach((el) => {
              const parentGroup = el.closest('g');
              if (el.tagName !== 'text' && parentGroup && !parentGroup.querySelector('text')) {
                if (fillingValue !== 'none') {
                  el.removeAttribute('style');
                  el.removeAttribute('fill');
                  el.removeAttribute('stroke');

                  if (fillingValue === 'fill') {
                    el.setAttribute('fill', maxColorEntry.color);
                  } else if (fillingValue === 'stroke') {
                    el.setAttribute('stroke', maxColorEntry.color);
                    el.setAttribute('fill', 'none');
                  } else {
                    el.setAttribute('fill', maxColorEntry.color);
                    el.setAttribute('stroke', maxColorEntry.color);
                  }
                }
              }
            });
          }
        }
      }
    });
  }

  private isValidRegex(regexString: string): boolean {
    if (regexString.length === 0) {
      return false;
    } // Проверка на пустую строку

    const regexSpecialChars = /[.*+?^${}()|[\]\\]/;
    if (!regexSpecialChars.test(regexString)) {
      return false;
    } // Проверка на наличие специальных символов

    try {
      new RegExp(regexString); // Проверка на валидность регулярного выражения
      return true;
    } catch (e) {
      return false; // Если возникла ошибка, значит регулярное выражение не валидно
    }
  }

  // Метод для проверки совпадения с регулярным выражением
  private matchRegex(regexString: string, displayName: string): boolean {
    const regex = new RegExp(regexString);
    return regex.test(displayName);
  }

  private processTooltip(tooltip: any, elementId: string, colorData: ColorDataEntry[], tooltipData: any[]) {
    const toolArray = Array.isArray(tooltip) ? tooltip : [tooltip];

    const validTooltips = toolArray.filter(({ show }) => show);

    if (validTooltips.length > 0) {
      const relevantColorData = colorData.filter((data) => data.id === elementId);

      relevantColorData.forEach(({ id: colorId, label, color, metric, unit }) => {
        const formattedMetric = unit ? formatValues(metric, unit) : metric;

        tooltipData.push({ id: colorId, label, color, metric: formattedMetric });
      });
    }
  }
}

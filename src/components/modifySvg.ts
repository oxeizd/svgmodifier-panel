import { Change } from './types';
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
    const colorMap = new Map<
      string,
      {
        colors: Array<{ id: string; refId: string; label: string; color: string; metric: number; filling?: string }>;
        metrics: Set<any>;
      }
    >();

    const dataExtractor = new DataExtractor(this.dataFrame);
    const extractedValueMap = dataExtractor.extractValues();

    const svgElement = doc.documentElement;
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');
    if (!svgElement.hasAttribute('viewBox')) {
      svgElement.setAttribute('viewBox', '0 0 100 100');
    }

    this.changes.forEach((change) => this.processChange(change, doc, extractedValueMap, colorMap, tooltipData));

    this.applyColorMap(doc, colorMap);

    return { modifiedSvg: new XMLSerializer().serializeToString(doc.documentElement), tooltipData };
  }

  private processChange(
    change: Change,
    doc: Document,
    extractedValueMap: any,
    colorMap: Map<string, any>,
    tooltipData: any[]
  ) {
    const { id, attributes } = change;
    const { tooltip, metrics, link, label, labelColor } = attributes || {};
    const ids = Array.isArray(id) ? id : [id];
    const firstId = ids[0];
    const element = doc.getElementById(firstId);

    if (!element || !(element instanceof SVGElement)) {
      return;
    }

    if (metrics && Array.isArray(metrics)) {
      this.processMetrics(element, metrics, extractedValueMap, colorMap, tooltipData, tooltip, ids);
    }

    if (link) {
      LinkManager.addLinkToElement(element, link);
    }

    if (label) {
      this.updateLabel(element, label, labelColor, colorMap);
    }
  }

  private processMetrics(
    element: SVGElement,
    metrics: any[],
    extractedValueMap: any,
    colorMap: Map<string, any>,
    tooltipData: any[],
    tooltip: any,
    ids: string[]
  ) {
    const metricProcessor = new MetricProcessor(element, metrics, extractedValueMap);
    const colorData = metricProcessor.process();

    if (!colorData.color || colorData.color.length === 0) {
      return;
    }

    colorData.color.forEach(({ id: colorId, refId, label, color, metric, filling }) => {
      if (!colorMap.has(colorId)) {
        colorMap.set(colorId, { colors: [], metrics: new Set() });
      }
      const entry = colorMap.get(colorId)!;
      entry.colors.push({ id: colorId, refId, label, color, metric, filling });
      metrics.forEach((m) => entry.metrics.add(m));
    });

    this.copyColorDataToOtherIds(ids, colorData, colorMap);
    if (tooltip) {
      this.processTooltip(tooltip, colorData.color, tooltipData);
    }
  }

  private copyColorDataToOtherIds(ids: string[], colorData: any, colorMap: Map<string, any>) {
    ids.slice(1).forEach((singleId) => {
      if (!colorMap.has(singleId)) {
        const firstColorData = colorMap.get(colorData.color[0].id);
        if (firstColorData) {
          colorMap.set(singleId, {
            colors: [...firstColorData.colors],
            metrics: new Set(firstColorData.metrics),
          });
        }
      }
    });
  }

  private updateLabel(element: SVGElement, label: string, labelColor: string | undefined, colorMap: Map<string, any>) {
    const metricValues = Array.from(colorMap.values()).flatMap((entry) =>
      entry.colors.map(
        (colorEntry: { id: string; refId: string; label: string; color: string; metric: number; filling?: string }) =>
          colorEntry.metric
      )
    );
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
            const validColors = Array.from(colorMap.values()).flatMap((entry) => entry.colors);
            const maxColorEntry = validColors.reduce(
              (max, entry) => (entry.metric > max.metric ? entry : max),
              validColors[0]
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
    for (const mapping of labelMapping) {
      const { condition, value, label } = mapping;
      let conditionMet = false;

      switch (condition) {
        case '>':
          conditionMet = metricValue > value;
          break;
        case '<':
          conditionMet = metricValue < value;
          break;
        case '=':
          conditionMet = metricValue === value;
          break;
        case '>=':
          conditionMet = metricValue >= value;
          break;
        case '<=':
          conditionMet = metricValue <= value;
          break;
        case '!=':
          conditionMet = metricValue !== value;
          break;
        default:
          continue;
      }

      if (conditionMet) {
        return label;
      }
    }
    return undefined;
  }

  private applyColorMap(doc: Document, colorMap: Map<string, any>) {
    colorMap.forEach(({ colors }, id) => {
      const element = doc.getElementById(id);
      if (element) {
        const validColors = colors.filter(
          (entry: { id: string; refId: string; label: string; color: string; metric: number; filling?: string }) =>
            entry.color !== ''
        );

        if (validColors.length > 0) {
          const maxColorEntry = validColors.reduce(
            (
              max: { id: string; refId: string; label: string; color: string; metric: number; filling?: string },
              entry: { id: string; refId: string; label: string; color: string; metric: number; filling?: string }
            ) => (entry.metric > max.metric ? entry : max),
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

  private processTooltip(tooltip: any, colorData: any[], tooltipData: any[]) {
    const toolArray = Array.isArray(tooltip) ? tooltip : [tooltip];
    const validTooltips = toolArray.filter(({ show }) => show);

    if (validTooltips.length > 0) {
      colorData.forEach(({ id: colorId, label, color, metric, unit }) => {
        const formattedMetric = unit ? formatValues(metric, unit) : metric;
        tooltipData.push({ id: colorId, label, color, metric: formattedMetric });
      });
    }
  }
}

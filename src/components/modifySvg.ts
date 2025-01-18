import { Change } from './types';
import { LinkManager } from './linkManager';
import { MetricProcessor } from './dataProcessor';
import { DataExtractor } from './dataExtractor';

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
    tooltipData: Array<{ id: string; label: string; color: string; metric: number | string }>;
  } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.svg, 'image/svg+xml');
    const tooltipData: Array<{ id: string; label: string; color: string; metric: number | string }> = [];
    const colorMap: Map<
      string,
      {
        colors: Array<{ id: string; refId: string; label: string; color: string; metric: number; filling?: string }>;
        metrics: Set<any>;
      }
    > = new Map();

    const dataExtractor = new DataExtractor(this.dataFrame);
    const extractedValueMap = dataExtractor.extractValues();

    const svgElement = doc.documentElement;
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');
    if (!svgElement.hasAttribute('viewBox')) {
      svgElement.setAttribute('viewBox', '0 0 100 100');
    }

    this.changes.forEach(({ id, attributes }: Change) => {
      const { tooltip, metrics, link } = attributes || {};
      const ids = Array.isArray(id) ? id : [id];

      const firstId = ids[0];
      const element = doc.getElementById(firstId);
      if (!(element instanceof SVGElement)) {
        return;
      }

      if (metrics && Array.isArray(metrics)) {
        const metricProcessor = new MetricProcessor(element, metrics, extractedValueMap);
        const colorData = metricProcessor.process();

        colorData.color.forEach(({ id: colorId, refId, label, color, metric, filling }) => {
          if (!colorMap.has(colorId)) {
            colorMap.set(colorId, { colors: [], metrics: new Set() });
          }
          const entry = colorMap.get(colorId)!;
          entry.colors.push({ id: colorId, refId, label, color, metric, filling });
          metrics.forEach((m) => entry.metrics.add(m));
        });

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

        if (tooltip) {
          this.processTooltip(tooltip, colorData.color, tooltipData);
        }
      }
      if (link) {
        LinkManager.addLinkToElement(element, link);
      }
    });

    colorMap.forEach(({ colors }, id) => {
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
            });
          }
        }
      }
    });

    return { modifiedSvg: new XMLSerializer().serializeToString(doc.documentElement), tooltipData };
  }

  processTooltip(tooltip: any, colorData: any[], tooltipData: any[]) {
    const toolArray = Array.isArray(tooltip) ? tooltip : [tooltip];

    toolArray.forEach(({ show }) => {
      if (show) {
        colorData.forEach(({ id: colorId, label, color, metric }) => {
          tooltipData.push({ id: colorId, label, color, metric });
        });
      }
    });
  }
}

import { DataExtractor } from 'components/dataExtractor';
import { Change, ColorDataEntry } from '../types';
import { MetricProcessor } from 'components/dataProcessor';
import { LinkManager } from './linkManager';
import { ColorApplier } from './ColorUpdater';
import { LabelUpdater } from './LabelUpdater';
import { formatValues } from './Formatter';

type TooltipItem = {
  id: string;
  label: string;
  color: string;
  metric: string;
};

export class SvgModifier {
  private svgElementsMap = new Map<string, SVGElement>();

  constructor(private svg: string, private changes: Change[], private dataFrame: any[]) {}

  public modify() {
    const doc = this.parseSvgDocument();
    const colorData: ColorDataEntry[] = [];
    const tooltipData: TooltipItem[] = [];

    const dataExtractor = new DataExtractor(this.dataFrame);
    const extractedValueMap = dataExtractor.extractValues();

    this.initializeSvgElement(doc);
    const config = this.getConfigs();
    this.processing(config, extractedValueMap, colorData, tooltipData);

    // Get only the elements that need color updates
    const colorElementIds = new Set(colorData.map((entry) => entry.id));
    const elementsForColorUpdate = this.getFilteredElementsMap(colorElementIds);

    ColorApplier.applyToElements(elementsForColorUpdate, colorData);

    return {
      modifiedSvg: new XMLSerializer().serializeToString(doc.documentElement),
      tooltipData,
    };
  }

  private processing(
    config: any[],
    extractedValueMap: Map<string, any>,
    colorData: ColorDataEntry[],
    tooltipData: TooltipItem[]
  ): void {
    config.forEach((element) => {
      const ids = element.id;

      const processor = new MetricProcessor(ids[0], element.attributes.metrics, extractedValueMap);
      const processedData = processor.process();

      if (processedData.color || processedData) {
        element.attributes.autoConfig === true
          ? this.handleAutoConfig(colorData, ids, processedData)
          : this.handleDefaultConfig(colorData, processedData, ids);
      }

      const elementsForUpdate = this.getFilteredElementsMap(new Set(ids));

      if (element.attributes.label) {
        console.log(element.attributes.labelMapping);
        LabelUpdater.updateElements(
          elementsForUpdate,
          element.attributes.label,
          element.attributes.labelColor,
          colorData,
          element.attributes.labelMapping
        );
      }

      if (element.attributes.link) {
        LinkManager.addLinks(elementsForUpdate, element.attributes.link);
      }

      if (element.attributes.tooltip && element.attributes.tooltip.show) {
        this.processTooltip(ids, colorData, tooltipData);
      }
    });
  }

  // Helper method to get a filtered map with only the needed elements
  private getFilteredElementsMap(ids: Set<string>): Map<string, SVGElement> {
    const filteredMap = new Map<string, SVGElement>();

    ids.forEach((id) => {
      const element = this.svgElementsMap.get(id);
      if (element) {
        filteredMap.set(id, element);
      }
    });

    return filteredMap;
  }

  private getConfigs(): Array<{ id: string[]; attributes: any }> {
    const configurations: Array<{ id: string[]; attributes: any }> = [];
    const allRelevantIds = new Set<string>();

    this.changes.forEach((change) => {
      const ids = Array.isArray(change.id) ? change.id : [change.id];
      const elementsIds = ids.flatMap((id) => this.getElementsByIdOrRegex(id));

      elementsIds.forEach((id) => allRelevantIds.add(id));

      if (elementsIds.length > 0) {
        configurations.push({
          id: elementsIds,
          attributes: { ...change.attributes },
        });
      }
    });

    // обработка параметров автоконфигурирования
    configurations.forEach((config) => {
      const { attributes } = config;

      if (attributes.schema === 'basic, box, text') {
        if (!attributes.tooltip) {
          attributes.tooltip = { show: true };
        }
        if (!attributes.metrics?.baseColor) {
          if (!attributes.metrics) {
            attributes.metrics = {};
          }
          attributes.metrics.baseColor = '#00ff00';
        }
      }
    });

    return configurations;
  }

  private processTooltip(ids: string[], colorData: ColorDataEntry[], tooltipData: TooltipItem[]): void {
    colorData
      .filter(({ id }) => ids.includes(id))
      .forEach(({ id, label, color, metric, unit }) => {
        const cleanedLabel = label.replace(/_prfx\d+/g, '');

        tooltipData.push({
          id,
          label: cleanedLabel,
          color,
          metric: unit ? formatValues(metric, unit) : metric.toString(),
        });
      });
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
      const baseEntries = colorData.filter((entry) => entry.id === ids[0]);

      baseEntries.forEach((baseEntry) => {
        ids.slice(1).forEach((id) => colorData.push({ ...baseEntry, id }));
      });
    }
  }

  private getElementsByIdOrRegex(id: string): string[] {
    if (this.isValidRegex(id)) {
      const regex = new RegExp(id);
      const matchingIds: string[] = [];

      this.svgElementsMap.forEach((_, elementId) => {
        if (regex.test(elementId)) {
          matchingIds.push(elementId);
        }
      });

      return matchingIds;
    } else {
      return this.svgElementsMap.has(id) ? [id] : [];
    }
  }

  private isValidRegex(pattern: string): boolean {
    try {
      new RegExp(pattern);
      return /[.*+?^${}()|[\]\\]/.test(pattern);
    } catch {
      return false;
    }
  }

  private parseSvgDocument(): Document {
    const parser = new DOMParser();
    return parser.parseFromString(this.svg, 'image/svg+xml');
  }

  private initializeSvgElement(doc: Document): void {
    Array.from(doc.querySelectorAll('[id^="cell"]')).forEach((element) => {
      if (element.id) {
        this.svgElementsMap.set(element.id, element as unknown as SVGElement);
      }
    });

    const svgElement = doc.documentElement;
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');

    if (!svgElement.hasAttribute('viewBox')) {
      svgElement.setAttribute('viewBox', '0 0 100 100');
    }
  }
}

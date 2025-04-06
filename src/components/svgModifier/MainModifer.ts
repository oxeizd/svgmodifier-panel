import { DataExtractor } from 'components/dataExtractor';
import { Change, ColorDataEntry, Legends, RefIds, TooltipContent } from '../types';
import { MetricProcessor } from 'components/dataProcessor';
import { LinkManager } from './linkManager';
import { ColorApplier } from './ColorUpdater';
import { LabelUpdater } from './LabelUpdater';
import { formatValues } from './Formatter';

const regexCache = new Map<string, RegExp>();
const regexResultCache = new Map<string, string[]>();

export class SvgModifier {
  private svgElementsMap = new Map<string, SVGElement>();

  constructor(private svg: string, private changes: Change[], private dataFrame: any[]) {}

  public modify() {
    const { doc, colorData, tooltipData } = this.initProcessing();
    const dataExtractor = new DataExtractor(this.dataFrame);
    const extractedValueMap = dataExtractor.extractValues();

    const config = this.getConfigs();
    this.processing(config, extractedValueMap, colorData, tooltipData);

    return {
      modifiedSvg: new XMLSerializer().serializeToString(doc),
      tooltipData,
    };
  }

  private initProcessing() {
    const doc = this.parseSvgDocument();
    const colorData: ColorDataEntry[] = [];
    const tooltipData: TooltipContent[] = [];
    return { doc, colorData, tooltipData };
  }

  private parseSvgDocument(): Document {
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.svg, 'image/svg+xml');
    const svgElement = doc.documentElement;

    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');

    const elements = doc.querySelectorAll<SVGElement>('[id^="cell"]');
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.id) {
        this.svgElementsMap.set(element.id, element);
      }
    }

    return doc;
  }

  private getConfigs(): Array<{ id: string[]; attributes: any }> {
    const configurations: Array<{ id: string[]; attributes: any }> = [];
    const allRelevantIds = new Set<string>();
    const changesLength = this.changes.length;

    for (let i = 0; i < changesLength; i++) {
      const change = this.changes[i];
      const rawIds = Array.isArray(change.id) ? change.id : [change.id];
      const rawIdsLength = rawIds.length;

      for (let j = 0; j < rawIdsLength; j++) {
        const rawId = rawIds[j];
        const [elementPattern, schemaName, metricsSelector] = rawId.split(':');
        const matchedElementIds = this.getElementsByIdOrRegex(elementPattern);

        if (matchedElementIds.length === 0) {
          continue;
        }

        const attributesCopy = this.deepClone(change.attributes);

        if (schemaName) {
          attributesCopy.schema = schemaName;

          if (metricsSelector && attributesCopy.metrics) {
            const selectedIndices = metricsSelector.split('|');
            const preprocessedSelectors = selectedIndices.map((s) => s.split('@'));
            const metricsLength = attributesCopy.metrics.length;

            for (let k = 0; k < metricsLength; k++) {
              const metric = attributesCopy.metrics[k];

              this.processSelectors(metric, preprocessedSelectors);
            }
          }
        }

        matchedElementIds.forEach((id) => allRelevantIds.add(id));
        configurations.push({
          id: matchedElementIds,
          attributes: attributesCopy,
        });
      }
    }

    configurations.forEach((config) => {
      if (config.attributes.schema) {
        this.applySchema(config.attributes);
      }
    });

    return configurations;
  }

  private processSelectors(metric: any, selectors: string[][]) {
    if (metric.refIds) {
      const filteredRefIds: RefIds[] = [];
      for (let l = 0; l < selectors.length; l++) {
        const [type, indexStr] = selectors[l];
        if (type === 'r') {
          const index = Number(indexStr) - 1;
          if (index >= 0 && index < metric.refIds.length) {
            filteredRefIds.push(metric.refIds[index]);
          }
        }
      }
      metric.refIds = filteredRefIds;
    }

    if (metric.legends) {
      const filteredLegends: Legends[] = [];
      for (let l = 0; l < selectors.length; l++) {
        const [type, indexStr] = selectors[l];
        if (type === 'l') {
          const index = Number(indexStr) - 1;
          if (index >= 0 && index < metric.legends.length) {
            filteredLegends.push(metric.legends[index]);
          }
        }
      }
      metric.legends = filteredLegends;
    }
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private isValidRegex(pattern: string): boolean {
    try {
      new RegExp(pattern);
      return /[.*+?^${}()|[\]\\]/.test(pattern);
    } catch {
      return false;
    }
  }

  private getElementsByIdOrRegex(id: string): string[] {
    if (regexResultCache.has(id)) {
      return regexResultCache.get(id)!;
    }

    if (this.isValidRegex(id)) {
      let regex = regexCache.get(id);
      if (!regex) {
        regex = new RegExp(id);
        regexCache.set(id, regex);
      }

      const matchingIds: string[] = [];
      this.svgElementsMap.forEach((_, elementId) => {
        if (regex!.test(elementId)) {
          matchingIds.push(elementId);
        }
      });

      regexResultCache.set(id, matchingIds);
      return matchingIds;
    }

    const result = this.svgElementsMap.has(id) ? [id] : [];
    regexResultCache.set(id, result);
    return result;
  }

  private applySchema(attributes: any) {
    const schema = attributes.schema;

    switch (schema) {
      case 'basic':
        delete attributes.label;
        delete attributes.labelColor;
        if (!attributes.tooltip) {
          attributes.tooltip = { show: true };
        }
        if (Array.isArray(attributes.metrics)) {
          attributes.metrics[0].filling = 'fill';
          attributes.metrics[0].baseColor = attributes.metrics[0].baseColor || '#00ff00';
        }
        break;
      case 'stroke':
        delete attributes.link;
        delete attributes.label;
        delete attributes.labelColor;
        delete attributes.tooltip;
        if (Array.isArray(attributes.metrics)) {
          attributes.metrics[0].filling = 'stroke';
          attributes.metrics[0].baseColor = attributes.metrics[0].baseColor || '#00ff00';
        }
        break;
      case 'text':
        delete attributes.link;
        delete attributes.tooltip;
        if (!attributes.label) {
          attributes.label = 'replace';
        }
        if (!attributes.labelColor) {
          attributes.labelColor = 'metric';
        }
        if (Array.isArray(attributes.metrics)) {
          attributes.metrics[0].filling = 'none';
          attributes.metrics[0].baseColor = attributes.metrics[0].baseColor || '#00ff00';
        }
        break;
    }
  }

  private processing(
    config: any[],
    extractedValueMap: Map<string, any>,
    colorData: ColorDataEntry[],
    tooltipData: TooltipContent[]
  ): void {
    const configLength = config.length;

    for (let i = 0; i < configLength; i++) {
      const element = config[i];
      const ids = element.id;
      const attributes = element.attributes;
      const processor = new MetricProcessor(ids[0], attributes.metrics, extractedValueMap);
      const processedData = processor.process();

      if (processedData.color) {
        if (attributes.autoConfig === true) {
          this.handleAutoConfig(colorData, ids, processedData);
        } else {
          this.handleDefaultConfig(colorData, processedData, ids);
        }
      }

      const elementsForUpdate = this.getFilteredElementsMap(new Set(ids));

      if (attributes.label) {
        LabelUpdater.updateElements(
          elementsForUpdate,
          attributes.label,
          attributes.labelColor,
          colorData,
          attributes.labelMapping
        );
      }

      if (attributes.link) {
        LinkManager.addLinks(elementsForUpdate, attributes.link);
      }

      if (attributes.tooltip?.show) {
        this.processTooltip(ids, colorData, tooltipData, attributes.tooltip);
      }

      ColorApplier.applyToElements(elementsForUpdate, colorData);
    }
  }

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

  private processTooltip(
    ids: string[],
    colorData: ColorDataEntry[],
    tooltipData: TooltipContent[],
    tooltipConfig?: any
  ): void {
    for (let i = 0; i < colorData.length; i++) {
      const entry = colorData[i];
      if (!ids.includes(entry.id)) {
        continue;
      }

      const cleanedLabel = entry.label.replace(/_prfx\d+/g, '');
      const tooltipItem: TooltipContent = {
        id: entry.id,
        label: cleanedLabel,
        color: entry.color,
        metric: entry.unit ? formatValues(entry.metric, entry.unit) : entry.metric.toString(),
      };

      if (tooltipConfig?.textAbove) {
        tooltipItem.textAbove = tooltipConfig.textAbove;
      }
      if (tooltipConfig?.textBelow) {
        tooltipItem.textBelow = tooltipConfig.textBelow;
      }

      tooltipData.push(tooltipItem);
    }
  }

  private handleAutoConfig(colorData: ColorDataEntry[], ids: string[], processedData: any): void {
    const minLength = Math.min(ids.length, processedData.color.length);
    for (let i = 0; i < minLength; i++) {
      colorData.push({ ...processedData.color[i], id: ids[i] });
    }

    if (processedData.color.length > ids.length) {
      const lastId = ids[ids.length - 1];
      for (let i = minLength; i < processedData.color.length; i++) {
        colorData.push({ ...processedData.color[i], id: lastId });
      }
    }
  }

  private handleDefaultConfig(colorData: ColorDataEntry[], processedData: any, ids: string[]): void {
    for (let i = 0; i < processedData.color.length; i++) {
      colorData.push(processedData.color[i]);
    }

    if (ids.length > 1) {
      const baseEntries = colorData.filter((entry) => entry.id === ids[0]);
      for (let i = 1; i < ids.length; i++) {
        for (let j = 0; j < baseEntries.length; j++) {
          colorData.push({ ...baseEntries[j], id: ids[i] });
        }
      }
    }
  }
}

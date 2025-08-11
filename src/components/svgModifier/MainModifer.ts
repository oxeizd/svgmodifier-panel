import { DataExtractor } from 'components/dataExtractor';
import { Change, ColorDataEntry, TooltipContent } from '../types';
import { MetricProcessor } from 'components/dataProcessor';
import { LinkManager } from './addLink';
import { ColorApplier } from './ConfigColor';
import { LabelUpdater } from './ConfigLabel';
import { formatValues } from './Formatter';
import { applySchema } from './ConfigSchema';

interface SvgModifierConfig {
  id: string[];
  attributes: any;
}

const regexCache = new Map<string, RegExp>();
const MAX_REGEX_CACHE_SIZE = 100;

export class SvgModifier {
  private svgElementsMap: Map<string, SVGElement>;
  private readonly parser: DOMParser;
  private readonly serializer: XMLSerializer;

  constructor(private readonly svg: string, private readonly changes: Change[], private readonly dataFrame: any[]) {
    this.svgElementsMap = new Map();
    this.parser = new DOMParser();
    this.serializer = new XMLSerializer();
  }

  public modify(): { modifiedSvg: string; tooltipData: TooltipContent[] } {
    const { doc, fullColorData, colorData, tooltipData } = this.initProcessing();
    const extractedValueMap = new DataExtractor(this.dataFrame).extractValues();
    const config = this.getConfigs();

    this.processing(config, extractedValueMap, fullColorData, colorData, tooltipData);

    return {
      modifiedSvg: this.serializer.serializeToString(doc),
      tooltipData,
    };
  }

  public clearCache(): void {
    regexCache.clear();
  }

  private initProcessing() {
    const doc = this.parseSvgDocument();
    return {
      doc,
      fullColorData: [] as ColorDataEntry[],
      colorData: [] as ColorDataEntry[],
      tooltipData: [] as TooltipContent[],
    };
  }

  private parseSvgDocument(): Document {
    const doc = this.parser.parseFromString(this.svg, 'image/svg+xml');
    const svgElement = doc.documentElement;

    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');

    const elements = doc.querySelectorAll<SVGElement>('[id^="cell"]');
    elements.forEach((element) => {
      if (element.id) {
        this.svgElementsMap.set(element.id, element);
      }
    });

    return doc;
  }

  private getConfigs(): SvgModifierConfig[] {
    const configurations: SvgModifierConfig[] = [];
    const allRelevantIds = new Set<string>();

    for (const change of this.changes) {
      const rawIds = Array.isArray(change.id) ? change.id : [change.id];
      const attributes = this.deepClone(change.attributes);

      if (attributes.autoConfig) {
        this.processHybridConfig(rawIds, attributes, configurations, allRelevantIds);
      } else {
        this.processManualConfig(rawIds, attributes, configurations, allRelevantIds);
      }
    }

    configurations.forEach((config) => {
      if (config.attributes.schema) {
        applySchema(config.attributes);
      }
    });

    return configurations;
  }

  private processHybridConfig(
    rawIds: string[],
    baseAttributes: any,
    configurations: SvgModifierConfig[],
    allRelevantIds: Set<string>
  ) {
    const autoConfigIds: string[] = [];
    const exceptions: Array<{ pattern: string; schema: string; selector: string }> = [];

    for (const rawId of rawIds) {
      const [pattern, schema, selector] = rawId.split(':');

      if (schema && selector === undefined) {
        exceptions.push({ pattern, schema, selector: '@all' });
      } else if (selector?.includes('@')) {
        exceptions.push({ pattern, schema, selector });
      } else {
        autoConfigIds.push(rawId);
      }
    }

    for (const { pattern, schema, selector } of exceptions) {
      const matchedIds = this.getElementsByIdOrRegex(pattern);
      if (!matchedIds.length) {
        continue;
      }

      const exceptionAttributes = this.deepClone(baseAttributes);
      exceptionAttributes.autoConfig = false;
      exceptionAttributes.schema = schema;

      if (exceptionAttributes.metrics) {
        this.processMetricsSelectors(exceptionAttributes.metrics, selector);
      }

      configurations.push({
        id: matchedIds,
        attributes: exceptionAttributes,
      });

      matchedIds.forEach((id) => allRelevantIds.add(id));
    }

    if (autoConfigIds.length) {
      const ids = this.processAutoConfig(autoConfigIds);
      if (ids.length) {
        configurations.push({
          id: ids,
          attributes: baseAttributes,
        });
      }
    }
  }

  private processManualConfig(
    rawIds: string[],
    attributes: any,
    configurations: SvgModifierConfig[],
    allRelevantIds: Set<string>
  ) {
    for (let i = 0; i < rawIds.length; i++) {
      const rawId = rawIds[i];
      const [pattern, schema, selector] = rawId.split(':');
      const matchedIds = this.getElementsByIdOrRegex(pattern);

      if (!matchedIds.length) {
        continue;
      }

      const attributesCopy = this.deepClone(attributes);

      if (schema) {
        attributesCopy.schema = schema;
        if (selector && attributesCopy.metrics) {
          this.processMetricsSelectors(attributesCopy.metrics, selector);
        }
      }

      if (attributesCopy.link) {
        if (Array.isArray(attributesCopy.link)) {
          if (i < attributesCopy.link.length) {
            attributesCopy.link = attributesCopy.link[i];
          } else {
            delete attributesCopy.link;
          }
        } else {
          attributesCopy.link = [attributesCopy.link];
        }
      }

      matchedIds.forEach((id) => allRelevantIds.add(id));
      configurations.push({
        id: matchedIds,
        attributes: attributesCopy,
      });
    }
  }

  private processAutoConfig(rawIds: string[]): string[] {
    const ids: string[] = [];
    for (const rawId of rawIds) {
      const [pattern] = rawId.split(':');
      ids.push(...this.getElementsByIdOrRegex(pattern));
    }
    return ids;
  }

  private processMetricsSelectors(metrics: any[], selector: string): void {
    const selectors: string[][] = selector.split('|').map((s: string) => s.split('@'));
    const refIdsIndexes: Set<number> = new Set();
    const legendsIndexes: Set<number> = new Set();

    for (const [type, idx] of selectors) {
      if (idx) {
        const indexes = idx
          .split(',')
          .map(Number)
          .map((i) => i - 1);
        if (type === 'r') {
          indexes.forEach((i) => refIdsIndexes.add(i));
        } else if (type === 'l') {
          indexes.forEach((i) => legendsIndexes.add(i));
        }
      }
    }

    for (const metric of metrics) {
      if (metric.refIds && selector !== '@all') {
        metric.refIds = metric.refIds.filter((_: any, i: number) => refIdsIndexes.has(i));
      }
      if (metric.legends && selector !== '@all') {
        metric.legends = metric.legends.filter((_: any, i: number) => legendsIndexes.has(i));
      }
    }
  }

  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item)) as unknown as T;
    }

    const clone = Object.create(Object.getPrototypeOf(obj));
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clone[key] = this.deepClone(obj[key]);
      }
    }
    return clone;
  }

  private isValidRegex(pattern: string): boolean {
    if (regexCache.has(pattern)) {
      return true;
    }

    try {
      if (regexCache.size >= MAX_REGEX_CACHE_SIZE) {
        regexCache.clear();
      }

      const regex = new RegExp(pattern);
      regexCache.set(pattern, regex);
      return /[.*+?^${}()|[\]\\]/.test(pattern);
    } catch {
      return false;
    }
  }

  private getElementsByIdOrRegex(id: string): string[] {
    return this.isValidRegex(id)
      ? Array.from(this.svgElementsMap.keys()).filter((k) => regexCache.get(id)!.test(k))
      : this.svgElementsMap.has(id)
      ? [id]
      : [];
  }

  private processing(
    configs: SvgModifierConfig[],
    extractedValueMap: Map<string, any>,
    fullColorData: ColorDataEntry[],
    colorData: ColorDataEntry[],
    tooltipData: TooltipContent[]
  ) {
    for (const config of configs) {
      colorData.length = 0;
      const { id: ids, attributes } = config;

      const processor = new MetricProcessor(ids[0], attributes.metrics, extractedValueMap);
      const processedData = processor.process();

      if (processedData && processedData.color) {
        if (attributes.autoConfig) {
          this.handleAutoConfig(colorData, ids, processedData);
        } else {
          this.handleDefaultConfig(colorData, processedData, ids);
        }

        const elements = this.getElementsForUpdate(ids);
        if (attributes.label || attributes.labelColor || attributes.labelMapping) {
          LabelUpdater.updateElements(
            elements,
            attributes.label,
            attributes.labelColor,
            colorData,
            attributes.labelMapping
          );
        }

        if (attributes.link) {
          LinkManager.addLinks(elements, attributes.link);
        }

        if (attributes.tooltip?.show) {
          this.processTooltip(colorData, tooltipData, attributes.tooltip);
        }
        fullColorData.push(...colorData);
        ColorApplier.applyToElements(elements, fullColorData);
      }
    }
  }

  private getElementsForUpdate(ids: string[]): Map<string, SVGElement> {
    const map = new Map<string, SVGElement>();
    for (const id of ids) {
      const el = this.svgElementsMap.get(id);
      if (el) {
        map.set(id, el);
      }
    }
    return map;
  }

  private processTooltip(colorData: ColorDataEntry[], tooltipData: TooltipContent[], tooltipConfig: any) {
    for (const entry of colorData) {
      tooltipData.push({
        id: entry.id,
        label: entry.label.replace(/_prfx\d+/g, ''),
        color: entry.color,
        metric: entry.unit ? formatValues(entry.metric, entry.unit) : entry.metric.toString(),
        title: entry.title,
        textAbove: tooltipConfig.textAbove,
        textBelow: tooltipConfig.textBelow,
      });
    }
  }

  private handleAutoConfig(colorData: ColorDataEntry[], ids: string[], processedData: { color: ColorDataEntry[] }) {
    const minLen = Math.min(ids.length, processedData.color.length);
    for (let i = 0; i < minLen; i++) {
      colorData.push({ ...processedData.color[i], id: ids[i] });
    }

    if (processedData.color.length > minLen) {
      const lastId = ids[minLen - 1];
      for (let i = minLen; i < processedData.color.length; i++) {
        colorData.push({ ...processedData.color[i], id: lastId });
      }
    }
  }

  private handleDefaultConfig(colorData: ColorDataEntry[], processedData: { color: ColorDataEntry[] }, ids: string[]) {
    colorData.push(...processedData.color);
    if (ids.length > 1) {
      this.replicateColorDataForIds(colorData, ids);
    }
  }

  private replicateColorDataForIds(colorData: ColorDataEntry[], ids: string[]) {
    const baseEntries = colorData.filter((e) => e.id === ids[0]);
    for (const entry of baseEntries) {
      for (const id of ids.slice(1)) {
        colorData.push({ ...entry, id });
      }
    }
  }
}

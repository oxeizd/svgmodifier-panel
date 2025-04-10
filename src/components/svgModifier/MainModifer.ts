import { DataExtractor } from 'components/dataExtractor';
import { Change, ColorDataEntry, TooltipContent } from '../types';
import { MetricProcessor } from 'components/dataProcessor';
import { LinkManager } from './linkManager';
import { ColorApplier } from './ColorUpdater';
import { LabelUpdater } from './LabelUpdater';
import { formatValues } from './Formatter';

interface SvgModifierConfig {
  id: string[];
  attributes: any;
}

const regexCache = new Map<string, RegExp>();
const regexResultCache = new Map<string, string[]>();

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
    const { doc, colorData, tooltipData } = this.initProcessing();
    const extractedValueMap = new DataExtractor(this.dataFrame).extractValues();
    const config = this.getConfigs();

    this.processing(config, extractedValueMap, colorData, tooltipData);

    return {
      modifiedSvg: this.serializer.serializeToString(doc),
      tooltipData,
    };
  }

  private initProcessing() {
    const doc = this.parseSvgDocument();
    return {
      doc,
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
        this.applySchema(config.attributes);
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

    // 1. Разделяем ID на обычные и исключения
    for (const rawId of rawIds) {
      const [pattern, schema, selector] = rawId.split(':');

      if (selector?.includes('@')) {
        exceptions.push({ pattern, schema, selector });
      } else {
        autoConfigIds.push(rawId);
      }
    }

    // 2. Обрабатываем исключения
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

    // 3. Обрабатываем автоконфиг для обычных ID
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
    for (const rawId of rawIds) {
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

    for (const metric of metrics) {
      if (metric.refIds && selector !== '@all') {
        metric.refIds = metric.refIds.filter((_: any, i: number) =>
          selectors.some(([type, idx]: string[]) => type === 'r' && Number(idx) - 1 === i)
        );
      }
      if (metric.legends && selector !== '@all') {
        metric.legends = metric.legends.filter((_: any, i: number) =>
          selectors.some(([type, idx]: string[]) => type === 'l' && Number(idx) - 1 === i)
        );
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
      const regex = new RegExp(pattern);
      regexCache.set(pattern, regex);
      return /[.*+?^${}()|[\]\\]/.test(pattern);
    } catch {
      return false;
    }
  }

  private getElementsByIdOrRegex(id: string): string[] {
    if (regexResultCache.has(id)) {
      return regexResultCache.get(id)!;
    }

    const result = this.isValidRegex(id)
      ? Array.from(this.svgElementsMap.keys()).filter((k) => regexCache.get(id)!.test(k))
      : this.svgElementsMap.has(id)
      ? [id]
      : [];

    regexResultCache.set(id, result);
    return result;
  }

  private applySchema(attributes: any) {
    const schema = attributes.schema;
    if (!schema) {
      return;
    }

    const schemaActions: Record<string, () => void> = {
      basic: () => {
        delete attributes.label;
        delete attributes.labelColor;
        attributes.tooltip = attributes.tooltip || { show: true };
        if (attributes.metrics?.[0]) {
          attributes.metrics[0].filling = 'fill';
          attributes.metrics[0].baseColor = attributes.metrics[0].baseColor || '#00ff00';
        }
      },
      stroke: () => {
        ['link', 'label', 'labelColor', 'tooltip'].forEach((p) => delete attributes[p]);
        delete attributes.metrics?.baseColor;
        if (attributes.metrics?.[0]) {
          attributes.metrics[0].filling = 'stroke';
          attributes.metrics[0].baseColor = '';
        }
      },
      strokeBase: () => {
        ['link', 'label', 'labelColor', 'tooltip'].forEach((p) => delete attributes[p]);
        if (attributes.metrics?.[0]) {
          attributes.metrics[0].filling = 'stroke';
        }
      },
      text: () => {
        delete attributes.link;
        delete attributes.tooltip;
        attributes.label = attributes.label || 'replace';
        attributes.labelColor = attributes.labelColor || 'metric';
        if (attributes.metrics?.[0]) {
          attributes.metrics[0].filling = 'none';
          attributes.metrics[0].baseColor = attributes.metrics[0].baseColor || '';
        }
      },
      table: () => {
        delete attributes.link;
        delete attributes.tooltip;
        attributes.label = attributes.label || 'replace';
        attributes.labelColor = attributes.labelColor || 'metric';
        if (attributes.metrics?.[0]) {
          attributes.metrics[0].filling = 'fill, 20';
          attributes.metrics[0].baseColor = attributes.metrics[0].baseColor || '#00ff00';
        }
      },
    };

    schemaActions[schema]?.();
  }

  private processing(
    config: SvgModifierConfig[],
    extractedValueMap: Map<string, any>,
    colorData: ColorDataEntry[],
    tooltipData: TooltipContent[]
  ) {
    for (const { id: ids, attributes } of config) {
      const processor = new MetricProcessor(ids[0], attributes.metrics, extractedValueMap);
      const processedData = processor.process();

      if (processedData.color) {
        if (attributes.autoConfig) {
          this.handleAutoConfig(colorData, ids, processedData);
        } else {
          this.handleDefaultConfig(colorData, processedData, ids);
        }
      }

      const elements = this.getElementsForUpdate(ids);
      if (attributes.label) {
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
        this.processTooltip(ids, colorData, tooltipData, attributes.tooltip);
      }

      ColorApplier.applyToElements(elements, colorData);
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

  private processTooltip(
    ids: string[],
    colorData: ColorDataEntry[],
    tooltipData: TooltipContent[],
    tooltipConfig: any
  ) {
    for (const entry of colorData) {
      if (!ids.includes(entry.id)) {
        continue;
      }

      tooltipData.push({
        id: entry.id,
        label: entry.label.replace(/_prfx\d+/g, ''),
        color: entry.color,
        metric: entry.unit ? formatValues(entry.metric, entry.unit) : entry.metric.toString(),
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

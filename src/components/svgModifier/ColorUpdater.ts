import { ColorDataEntry } from '../types';

export class ColorApplier {
  public static applyToElements(elementsMap: Map<string, SVGElement>, colorData: ColorDataEntry[]): void {
    const colorMap = this.createColorMap(colorData);

    colorMap.forEach((entries, id) => {
      const element = elementsMap.get(id);
      if (!element) {
        return;
      }

      const bestEntry = this.findBestColorEntry(entries);
      if (bestEntry) {
        this.applyEntryStyles(element, bestEntry);
      }
    });
  }

  private static createColorMap(colorData: ColorDataEntry[]): Map<string, ColorDataEntry[]> {
    return colorData.reduce((map, entry) => {
      const entries = map.get(entry.id) || [];
      entries.push(entry);
      map.set(entry.id, entries);
      return map;
    }, new Map<string, ColorDataEntry[]>());
  }

  private static findBestColorEntry(entries: ColorDataEntry[]): ColorDataEntry {
    return entries.reduce((best, current) => {
      const currentLvl = current.lvl ?? Number.NEGATIVE_INFINITY;
      const bestLvl = best.lvl ?? Number.NEGATIVE_INFINITY;

      return currentLvl > bestLvl || (currentLvl === bestLvl && current.metric > best.metric) ? current : best;
    }, entries[0]);
  }

  private static applyEntryStyles(element: SVGElement, entry: ColorDataEntry): void {
    if (!entry.color) {
      return;
    }

    const styleableElements = element.querySelectorAll<SVGElement>('[fill], [stroke]');
    const entryFilling = entry.filling ? entry.filling.split(',').map((s) => s.trim()) : [];
    const fillingType = entryFilling[0];
    const opacity = Number.parseInt(entryFilling[1] || '100', 10);

    for (const el of styleableElements) {
      const parentGroup = el.closest('g');
      if (el.tagName === 'text' || parentGroup?.querySelector('text')) {
        continue;
      }

      const defStyle = el.getAttribute('style');
      const strokeValue = el.getAttribute('stroke');
      el.removeAttribute('style');

      if (entry.filling) {
        if (!isNaN(opacity) && opacity >= 0 && opacity <= 100) {
          el.setAttribute('opacity', (opacity / 100).toString());
        }

        switch (fillingType) {
          case 'fill':
            el.setAttribute('fill', entry.color);
            break;
          case 'stroke':
            el.setAttribute('stroke', entry.color);
            break;
          case 'none':
            if (defStyle) {
              el.setAttribute('style', defStyle);
            }
            continue;
          case 'fs':
            el.setAttribute('fill', entry.color);
            el.setAttribute('stroke', entry.color);
            break;
          default:
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
    }
  }
}

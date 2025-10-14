import { ColorDataEntry, ValueMapping, ExpandedItem } from './types';
import { getMappingMatch } from './utils/helpers';

/**
 * Парсит SVG строку в DOM документ и извлекает элементы с ID начинающимися на "cell"
 */
export const parseSvgDocument = (svg: string, parser: DOMParser) => {
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgElement = doc.documentElement;

  svgElement.setAttribute('width', '100%');
  svgElement.setAttribute('height', '100%');

  const elementsMap = new Map<string, SVGElement>();
  const elements = doc.querySelectorAll<SVGElement>('[id^="cell"]');

  elements.forEach((element) => {
    if (element.id) {
      elementsMap.set(element.id, element);
    }
  });

  return { doc, elementsMap };
};

/**
 * Применяет изменения к элементам SVG батчем
 */
export function applyChangesToElements(items: ExpandedItem[]): void {
  const operations: Array<() => void> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const svgElement = item.svgElement;
    if (!svgElement) {
      continue;
    }

    const { link, label, labelColor, valueMapping } = item.attributes ?? {};

    const linksArray = Array.isArray(link) ? (link as string[]) : undefined;
    const linkForThis = linksArray ? linksArray[i] : link;

    const maxEntries = item.maxEntry ?? undefined;
    operations.push(() => {
      const labelElements = findLabelElements(svgElement);

      if (linkForThis !== undefined) {
        addLinksToSvgElements(svgElement, linkForThis.toString());
      }

      if (label) {
        setLabelContent(labelElements, label, maxEntries?.label, maxEntries?.metric, valueMapping);
      }

      if (labelColor) {
        applyColorToLabels(labelElements, labelColor, maxEntries?.color);
      }

      if (maxEntries) {
        applyColortoElement(svgElement, maxEntries);
      }
    });
  }

  executeBatchOperations(operations);
}

/**
 * Добавляет ссылки к SVG элементам батчем
 */
function addLinksToSvgElements(svgElement: SVGElement, link: string): void {
  const parent = svgElement.parentNode;
  if (!parent) {
    return;
  }

  if (svgElement.hasAttribute('data-has-link')) {
    return;
  }

  const linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'a');

  linkElement.setAttribute('target', '_blank');
  linkElement.setAttribute('href', link);

  svgElement.setAttribute('data-has-link', 'true');
  parent.insertBefore(linkElement, svgElement);
  linkElement.appendChild(svgElement);
}

function executeBatchOperations(operations: Array<() => void>): void {
  if (operations.length === 0) {
    return;
  }

  // Временное отключение перерисовки (если работает с живым DOM)
  const style = document.createElement('style');
  style.textContent = '* { transition: none !important; animation: none !important; }';
  document.head.appendChild(style);

  try {
    // Выполняем все операции
    operations.forEach((op) => op());
  } finally {
    // Восстанавливаем стили
    document.head.removeChild(style);
  }
}

function applyColortoElement(element: SVGElement, entry: ColorDataEntry): void {
  if (!entry.color) {
    return;
  }

  const styleableElements = element.querySelectorAll<SVGElement>('[fill], [stroke]');
  const entryFilling = entry.filling ? entry.filling.split(',').map((s) => s.trim()) : [];
  const fillingType = entryFilling[0];
  const opacity = Number.parseInt(entryFilling[1] || '100', 10);

  // Предварительная подготовка данных
  const modifications: Array<{ element: SVGElement; attributes: Array<[string, string]> }> = [];

  for (const el of styleableElements) {
    const parentGroup = el.closest('g');
    if (el.tagName === 'text' || parentGroup?.querySelector('text')) {
      continue;
    }

    const defStyle = el.getAttribute('style');
    const strokeValue = el.getAttribute('stroke');

    const attributes: Array<[string, string]> = [];

    if (entry.filling) {
      if (!isNaN(opacity) && opacity >= 0 && opacity <= 100) {
        attributes.push(['opacity', (opacity / 100).toString()]);
      }

      switch (fillingType) {
        case 'fill':
          attributes.push(['fill', entry.color]);
          break;
        case 'stroke':
          attributes.push(['stroke', entry.color]);
          break;
        case 'none':
          if (defStyle) {
            attributes.push(['style', defStyle]);
          }
          break;
        case 'fs':
          attributes.push(['fill', entry.color]);
          attributes.push(['stroke', entry.color]);
          break;
        default:
          if (defStyle) {
            attributes.push(['style', defStyle]);
          }
      }
    } else {
      if (strokeValue !== 'none') {
        attributes.push(['stroke', entry.color]);
      }
      attributes.push(['fill', entry.color]);
    }

    if (attributes.length > 0) {
      modifications.push({ element: el, attributes });
    }
  }

  modifications.forEach(({ element, attributes }) => {
    element.removeAttribute('style');
    attributes.forEach(([name, value]) => {
      element.setAttribute(name, value);
    });
  });
}

function findLabelElements(element: SVGElement): Array<SVGTextElement | HTMLElement> {
  const elements: Array<SVGTextElement | HTMLElement> = [];

  const textElement = element.querySelector('text');
  if (textElement) {
    elements.push(textElement);
  }

  const htmlElement = element.querySelector('foreignObject')?.querySelector('div');
  if (htmlElement) {
    elements.push(htmlElement);
  }

  return elements;
}

function setLabelContent(
  elements: Array<SVGTextElement | HTMLElement>,
  label: string,
  metricLabel?: string,
  metricValue?: number | undefined,
  mappings?: ValueMapping[]
): void {
  let content = '';

  const displayValue =
    metricValue === undefined ? '' : getMappingMatch(mappings, metricValue) ?? metricValue.toString();

  switch (label) {
    case 'replace':
      content = displayValue || '';
      break;
    case 'legend':
      if (metricLabel) {
        content = metricLabel;
      }
      break;
    case 'legend +':
      content = metricLabel + ': ' + displayValue;
      break;
    case 'colon':
      content = metricLabel + ': ' + displayValue;
      break;
    case 'space':
      content = label + ' ' + displayValue;
      break;
    default:
      content = label;
      break;
  }

  elements.forEach((el) => {
    if (el instanceof HTMLElement && el.closest('foreignObject')) {
      const originalHTML = el.innerHTML;
      const match = originalHTML.match(/^(<[^>]*>)?([^<]*)(<\/[^>]*>)?$/);

      if (match) {
        const prefix = match[1] || '';
        const suffix = match[3] || '';
        el.innerHTML = prefix + content + suffix;
      } else {
        el.textContent = content;
      }
    } else {
      el.textContent = content;
    }
  });
}

function applyColorToLabels(
  elements: Array<SVGTextElement | HTMLElement>,
  colorSetting: string | undefined,
  elementColor?: string
): void {
  if (!colorSetting) {
    return;
  }

  const color = colorSetting === 'metric' ? elementColor : colorSetting;
  if (!color) {
    return;
  }

  elements.forEach((el) => {
    if (!el || !el.isConnected) {
      return;
    }

    if (el instanceof SVGTextElement) {
      el.setAttribute('fill', color);
      el.querySelectorAll('text').forEach((textEl) => {
        textEl.setAttribute('fill', color);
        textEl.removeAttribute('stroke');
      });
    } else if (el instanceof HTMLElement) {
      el.style.color = color;
      el.querySelectorAll('[style*="color"], [fill]').forEach((colorEl) => {
        if (colorEl instanceof SVGElement && colorEl.hasAttribute('fill')) {
          colorEl.setAttribute('fill', color);
        } else if (colorEl instanceof HTMLElement) {
          colorEl.style.color = color;
        }
      });
    }
  });
}

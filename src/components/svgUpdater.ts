import { ColorDataEntry, ValueMapping, DataMap } from '../types';
import { getMappingMatch } from './utils/helpers';

const parser = new DOMParser();

/**
 * Парсит SVG строку в DOM документ и извлекает элементы с ID начинающимися на "cell"
 */
export function svgUpdater(svg: string, svgAspectRatio: string) {
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgElement = doc.documentElement;

  svgElement.setAttribute('width', '100%');
  svgElement.setAttribute('height', '100%');

  if (svgAspectRatio !== 'disable') {
    svgElement.setAttribute('preserveAspectRatio', svgAspectRatio);
  }

  const elementsMap = new Map<string, SVGElement>();
  const elements = doc.querySelectorAll<SVGElement>('[id^="cell"]');

  elements.forEach((element) => {
    if (element.id) {
      elementsMap.set(element.id, element);
    }
  });

  return {
    elementsMap,
    tempDoc: doc,
  };
}

/**
 * Применяет изменения к элементам SVG батчем
 */
export function applyChangesToElements(items: Map<string, DataMap>): void {
  let index = 0;
  const operations: Array<() => void> = [];

  items.forEach((el, key) => {
    const svgElement = el.SVGElem;
    const link = el.attributes?.link;
    const label = el.attributes?.label;
    const labelColor = el.attributes?.labelColor;
    const valueMapping = el.attributes?.valueMapping;
    const mEntry = el.maxEntry;

    const linkForEl = Array.isArray(link) && index < link.length ? link[index] : link;

    if (svgElement) {
      operations.push(() => {
        if (linkForEl) {
          addLinksToSvgElements(svgElement, linkForEl.toString());
        }

        if (label || labelColor) {
          const labelElements = findLabelElements(svgElement);

          if (label) {
            setLabelContent(labelElements, label, mEntry?.label, mEntry?.metricValue, valueMapping);
          }

          if (labelColor) {
            applyColorToLabels(labelElements, labelColor, mEntry?.color);
          }
        }

        if (mEntry) {
          applyColortoElement(svgElement, mEntry);
        }
      });
    }
    index++;
  });

  executeBatchOperations(operations);
}

function executeBatchOperations(operations: Array<() => void>): void {
  if (operations.length === 0) {
    return;
  }

  const style = document.createElement('style');
  style.textContent = '* { transition: none !important; animation: none !important; }';
  document.head.appendChild(style);

  try {
    operations.forEach((op) => op());
  } finally {
    document.head.removeChild(style);
  }
}

/**
 * Добавляет ссылки к SVG элементам батчем
 */
function addLinksToSvgElements(svgElement: SVGElement, link: string): void {
  const parent = svgElement.parentNode;
  if (!parent || svgElement.hasAttribute('data-has-link')) {
    return;
  }

  const linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'a');

  linkElement.setAttribute('target', '_blank');
  linkElement.setAttribute('href', link);

  svgElement.setAttribute('data-has-link', 'true');
  parent.insertBefore(linkElement, svgElement);
  linkElement.appendChild(svgElement);
}

function applyColortoElement(element: SVGElement, entry: ColorDataEntry): void {
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

    applyColorToElementRecursive(el, entry.color, fillingType, opacity);
  }
}

/**
 * Рекурсивно применяет цвет к элементу и его дочерним элементам
 */
function applyColorToElementRecursive(element: SVGElement, color: string, fillingType: string, opacity: number): void {
  if (element.hasChildNodes()) {
    for (let child of element.children) {
      if (child instanceof SVGElement) {
        applyColorToElementRecursive(child, color, fillingType, opacity);
      }
    }
  }

  const defStyle = element.getAttribute('style');
  const strokeValue = element.getAttribute('stroke');

  element.removeAttribute('style');

  if (fillingType) {
    if (!isNaN(opacity) && opacity >= 0 && opacity <= 100) {
      element.setAttribute('opacity', (opacity / 100).toString());
    }

    switch (fillingType) {
      case 'fill':
        element.setAttribute('fill', color);
        break;
      case 'stroke':
        element.setAttribute('stroke', color);
        break;
      case 'none':
        if (defStyle) {
          element.setAttribute('style', defStyle);
        }
        break;
      case 'fs':
        element.setAttribute('fill', color);
        element.setAttribute('stroke', color);
        break;
      default:
        if (defStyle) {
          element.setAttribute('style', defStyle);
        }
    }
  } else {
    if (strokeValue !== 'none') {
      element.setAttribute('stroke', color);
    }
    element.setAttribute('fill', color);
  }
}

function findLabelElements(element: SVGElement): Array<SVGTextElement | HTMLElement> {
  const elements: Array<SVGTextElement | HTMLElement> = [];

  function findTextElementsRecursive(el: Element): void {
    if (el.tagName === 'text') {
      elements.push(el as SVGTextElement);
    } else if (el.tagName === 'foreignObject') {
      const htmlElement = el.querySelector('div');
      if (htmlElement) {
        elements.push(htmlElement);
      }
    } else {
      for (let child of el.children) {
        findTextElementsRecursive(child);
      }
    }
  }

  findTextElementsRecursive(element);
  return elements;
}

function setLabelContent(
  elements: Array<SVGTextElement | HTMLElement>,
  label: string,
  metricLabel?: string,
  metricValue?: number | undefined,
  mappings?: ValueMapping[]
): void {
  if (elements.length === 0) {
    return;
  }

  const displayValue =
    metricValue === undefined ? '' : getMappingMatch(mappings, metricValue) ?? metricValue.toString();

  let content = '';

  switch (label) {
    case 'replace':
      content = displayValue;
      break;
    case 'legend':
      content = metricLabel || '';
      break;
    case 'colon':
      content = metricLabel ? `${metricLabel}: ${displayValue}` : displayValue;
      break;
    case 'space':
      content = metricLabel ? `${metricLabel} ${displayValue}` : displayValue;
      break;
    default:
      content = label;
      break;
  }

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];

    if (el instanceof HTMLElement && el.closest('foreignObject')) {
      updateElementContentRecursive(el, content);
    } else {
      el.textContent = content;
    }
  }
}

/**
 * Рекурсивно обновляет содержимое элемента с сохранением структуры
 */
function updateElementContentRecursive(element: Element, content: string): void {
  if (element.hasChildNodes()) {
    let textNodes: Text[] = [];

    for (let child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        textNodes.push(child as Text);
      }
    }

    if (textNodes.length === 1) {
      textNodes[0].textContent = content;
    } else if (textNodes.length > 1) {
      textNodes[0].textContent = content;
      for (let i = 1; i < textNodes.length; i++) {
        textNodes[i].parentNode?.removeChild(textNodes[i]);
      }
    } else {
      let foundTextContainer = false;

      for (let child of element.children) {
        if (child.children.length === 0 && child.textContent?.trim()) {
          child.textContent = content;
          foundTextContainer = true;
          break;
        } else {
          updateElementContentRecursive(child, content);
          foundTextContainer = true;
        }
      }

      if (!foundTextContainer) {
        element.textContent = content;
      }
    }
  } else {
    element.textContent = content;
  }
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

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];

    if (!el || !el.isConnected) {
      continue;
    }

    applyColorToLabelRecursive(el, color);
  }
}

function applyColorToLabelRecursive(element: SVGTextElement | HTMLElement, color: string): void {
  if (element instanceof SVGTextElement) {
    element.setAttribute('fill', color);
    element.removeAttribute('stroke');

    if (element.hasChildNodes()) {
      for (let child of element.children) {
        if (child instanceof SVGTextElement) {
          applyColorToLabelRecursive(child, color);
        }
      }
    }
  } else if (element instanceof HTMLElement) {
    element.style.color = color;

    if (element.hasChildNodes()) {
      for (let child of element.children) {
        if (child instanceof HTMLElement || child instanceof SVGElement) {
          applyColorToLabelRecursive(child as any, color);
        }
      }
    }
  }
}

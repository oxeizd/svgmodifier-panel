import { ColorDataEntry, ValueMapping, DataMap } from '../types';
import { getMappingMatch } from './utils/helpers';

/*
 * Парсит SVG-строку в Document, устанавливает базовые атрибуты
 */
export function initSVG(svg: string, svgAspectRatio?: string): Document | null {
  if (!svg) {
    return null;
  }

  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const svgDoc = doc.documentElement;

  svgDoc.setAttribute('width', '100%');
  svgDoc.setAttribute('height', '100%');

  if (svgAspectRatio && svgAspectRatio !== 'disable') {
    svgDoc.setAttribute('preserveAspectRatio', svgAspectRatio);
  }

  return doc;
}

export function svgToString(doc: Document): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

export function applyChangesToElements(elMap: Map<string, DataMap>): void {
  const operations: Array<() => void> = [];

  for (const [_, el] of elMap.entries()) {
    const svgElement = el.SVGElem;

    if (!svgElement) {
      continue;
    }

    const link = el.attributes?.link;
    const label = el.attributes?.label;
    const labelColor = el.attributes?.labelColor;
    const valueMapping = el.attributes?.valueMapping;
    const maxEntry = el.maxEntry;
    // const styleOverrides = el.attributes?.styleOverrides;

    operations.push(() => {
      if (link) {
        addLinksToSvgElement(svgElement, link.toString());
      }

      if (maxEntry) {
        applyColorToElement(svgElement, maxEntry);
      }

      if (label || labelColor) {
        const labelElements = findLabelElements(svgElement);

        if (label) {
          const labelContent = getLabel(label, maxEntry?.label, maxEntry?.metricValue, valueMapping);
          setLabelContent(labelElements, labelContent);
        }

        if (labelColor) {
          const color = getLabelColor(labelColor, maxEntry?.color);
          applyColorToLabels(labelElements, color);
        }
      }
    });
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
function addLinksToSvgElement(svgElement: SVGElement, link: string): void {
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

function applyColorToElement(element: SVGElement, entry: ColorDataEntry): void {
  if (!entry.color) {
    return;
  }

  const styleableElements = element.querySelectorAll<SVGElement>('[fill], [stroke]');
  const result = getElColor(entry.color, entry.filling);

  for (const el of styleableElements) {
    const parentGroup = el.closest('g');
    if (el.tagName === 'text' || parentGroup?.querySelector('text')) {
      continue;
    }

    applyColorToElementRecursive(el, result);
  }
}

/**
 * Рекурсивно применяет цвет к элементу и его дочерним элементам
 */
function applyColorToElementRecursive(element: SVGElement, elCOlor: Array<string | null> & { length: 3 }): void {
  if (element.hasChildNodes()) {
    for (let child of element.children) {
      if (child instanceof SVGElement) {
        applyColorToElementRecursive(child, elCOlor);
      }
    }
  }
  const [fill, stroke, opacity] = elCOlor;
  const shouldApplyFill = fill != null && fill !== '';
  const shouldApplyStroke = stroke != null && stroke !== '';
  const shouldApplyOpacity = opacity != null && opacity !== '';

  const defStyle = element.getAttribute('style');
  element.removeAttribute('style');

  if (shouldApplyFill) {
    element.setAttribute('fill', fill);
  }

  if (shouldApplyStroke) {
    element.setAttribute('stroke', stroke);
  }

  if (shouldApplyOpacity) {
    element.setAttribute('opacity', opacity);
  }

  const hasOriginalFill = element.hasAttribute('fill');
  const hasOriginalStroke = element.hasAttribute('stroke');

  if (!shouldApplyFill && !shouldApplyStroke && defStyle && !hasOriginalFill && !hasOriginalStroke) {
    element.setAttribute('style', defStyle);
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

function setLabelContent(elements: Array<SVGTextElement | HTMLElement>, content: string): void {
  if (elements.length === 0) {
    return;
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

function applyColorToLabels(elements: Array<SVGTextElement | HTMLElement>, color: string): void {
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

function getLabelColor(colorSetting: string | undefined, elementColor?: string): string {
  if (!colorSetting) {
    return '';
  }

  const color = colorSetting === 'metric' ? elementColor : colorSetting;

  if (!color) {
    return '';
  }

  return color;
}

function getLabel(
  label: string,
  metricLabel?: string,
  metricValue?: number | undefined,
  mappings?: ValueMapping[]
): string {
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

  return content;
}

function getElColor(color: string, filling?: string): [string | null, string | null, string | null] {
  const entryFilling = filling ? filling.split(',').map((s) => s.trim()) : [];
  const fillingType = entryFilling[0];
  const opacity = Number.parseInt(entryFilling[1], 10);

  let colorOpacity = null;
  let fill = null;
  let stroke = null;

  if (fillingType) {
    if (!isNaN(opacity) && opacity >= 0 && opacity <= 100) {
      colorOpacity = (opacity / 100).toString();
    }

    switch (fillingType) {
      case 'fill':
        fill = color;
        break;
      case 'stroke':
        stroke = color;
        break;
      case 'none':
        break;
      case 'fs':
        fill = color;
        stroke = color;
        break;
      default:
        break;
    }
  } else {
    fill = color;
  }

  return [fill, stroke, colorOpacity];
}

import { ValueMapping, DataMap } from '../types';
import { getMappingMatch } from './utils/helpers';

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

export function updateSvg(elMap: Map<string, DataMap>): void {
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
      addLinkToSvgElement(svgElement, link?.toString());

      const text = getLabelText(label, maxEntry?.label, maxEntry?.metricValue, valueMapping);
      const textColor = getLabelColor(labelColor, maxEntry?.color);
      const elColor = getElementColor(maxEntry?.color, maxEntry?.filling);

      updateSvgElementRecursive(svgElement, text, textColor, elColor);
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

function addLinkToSvgElement(svgElement: SVGElement, link?: string): void {
  const parent = svgElement.parentNode;
  if (!parent || svgElement.hasAttribute('data-has-link') || !link) {
    return;
  }

  const linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'a');

  linkElement.setAttribute('target', '_blank');
  linkElement.setAttribute('href', link);

  svgElement.setAttribute('data-has-link', 'true');
  parent.insertBefore(linkElement, svgElement);
  linkElement.appendChild(svgElement);
}

function getLabelText(
  label: string | undefined,
  metricLabel?: string,
  metricValue?: number | undefined,
  mappings?: ValueMapping[]
): string | undefined {
  if (!label) {
    return undefined;
  }

  let displayValue: string | undefined;
  let content;

  if (mappings && metricValue !== undefined) {
    displayValue = getMappingMatch(mappings, metricValue);
  } else if (metricValue !== undefined) {
    displayValue = metricValue.toString();
  } else {
    displayValue = '';
  }

  switch (label) {
    case 'replace':
      content = displayValue ?? '';
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

function getLabelColor(colorSetting: string | undefined, elementColor?: string): string | undefined {
  if (!colorSetting) {
    return undefined;
  }

  const color = colorSetting === 'metric' ? elementColor : colorSetting;

  if (!color) {
    return '';
  }

  return color;
}

function getElementColor(color: string | undefined, filling?: string): [string | null, string | null, string | null] {
  if (!color) {
    return [null, null, null];
  }

  const entryFilling = filling ? filling.split(',').map((s) => s.trim()) : [];
  const fillingType = entryFilling[0];
  const opacityValue = parseInt(entryFilling[1], 10);

  let colorOpacity = null;
  let fill = null;
  let stroke = null;

  if (!isNaN(opacityValue) && opacityValue >= 0 && opacityValue <= 100) {
    colorOpacity = (opacityValue / 100).toString();
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
      fill = color;
  }

  return [fill, stroke, colorOpacity];
}

function updateSvgElementRecursive(
  element: Element,
  text?: string,
  textColor?: string,
  elColor?: ReturnType<typeof getElementColor>
): void {
  const hasChildren = element.children.length > 0;

  if (elColor && element instanceof SVGElement) {
    if (element.tagName !== 'foreignObject' && !element.querySelector('text')) {
      applyColorToElement(element, elColor);
    }
  }

  if (textColor) {
    if (element instanceof SVGTextElement) {
      element.setAttribute('fill', textColor);
      element.removeAttribute('stroke');
    } else if (element instanceof HTMLElement) {
      element.style.color = textColor;
    }
  }

  if (text) {
    if (element instanceof SVGTextElement || element instanceof HTMLElement) {
      for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i];
        if (child.nodeType === Node.TEXT_NODE) {
          child.textContent = text;
          break;
        }
      }
    }
  }

  if (hasChildren) {
    for (const child of element.children) {
      updateSvgElementRecursive(child, text, textColor, elColor);
    }
  }
}

function applyColorToElement(element: SVGElement, [fill, stroke, opacity]: ReturnType<typeof getElementColor>): void {
  if (element instanceof SVGTextElement) {
    return;
  }

  if (!element.hasAttribute('data-original-fill')) {
    element.setAttribute('data-original-fill', element.getAttribute('fill') || '');
    element.setAttribute('data-original-stroke', element.getAttribute('stroke') || '');
    element.setAttribute('data-original-fill-opacity', element.getAttribute('fill-opacity') || '');
  }

  const hasFill = fill && fill !== '';
  const hasStroke = stroke && stroke !== '';
  const hasOpacity = opacity && opacity !== '';

  if (!hasFill && !hasStroke && !hasOpacity) {
    const origFill = element.getAttribute('data-original-fill');
    const origStroke = element.getAttribute('data-original-stroke');
    const origOpacity = element.getAttribute('data-original-fill-opacity');

    if (origFill !== null) {
      element.setAttribute('fill', origFill);
    }
    if (origStroke !== null) {
      element.setAttribute('stroke', origStroke);
    }
    if (origOpacity !== null) {
      element.setAttribute('fill-opacity', origOpacity);
    }
  } else {
    element.removeAttribute('style');

    if (hasFill) {
      element.setAttribute('fill', fill);
    }

    if (hasStroke) {
      element.setAttribute('stroke', stroke);
    }

    if (hasOpacity) {
      element.setAttribute('fill-opacity', opacity);
    }
  }
}

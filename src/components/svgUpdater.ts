import { getElementColor, getLabel, getLabelColor } from './utils/updateSvgUtils';
import { DataMap } from 'types';

export function initSVG(svg: string, svgAspectRatio?: string): Document | null {
  if (!svg) {
    return null;
  }

  const cleanSVG = svg
    .replace(/\s+content="[^"]*"/g, '') // 1. Убираем content="..."
    .replace(/(<\/svg>)[\s\S]*/i, '$1'); // 2. Убираем всё после </svg>

  const doc = new DOMParser().parseFromString(cleanSVG, 'image/svg+xml');
  const svgDoc = doc.documentElement;

  svgDoc.setAttribute('width', '100%');
  svgDoc.setAttribute('height', '100%');

  if (svgAspectRatio && svgAspectRatio !== 'disable') {
    svgDoc.setAttribute('preserveAspectRatio', svgAspectRatio);
  }

  return doc;
}

export function svgToString(svg: Document): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}

export async function updateSvg(configMap: Map<string, DataMap>): Promise<void> {
  const operations: Array<() => void> = [];

  for (const element of configMap.values()) {
    const svgElement = element.SVGElem;

    if (!svgElement) {
      continue;
    }

    const vizData = element.maxEntry;
    const attributes = element.attributes;

    const hasLink = attributes ? 'link' in attributes : false;
    const hasLabel = attributes ? 'label' in attributes : false;
    const hasLabelColor = attributes ? 'labelColor' in attributes : false;

    const label = getLabel(vizData, attributes?.label);
    const labelColor = getLabelColor(attributes?.labelColor, vizData?.color);
    const elementColors = getElementColor(vizData?.color, vizData?.filling);

    operations.push(() => {
      hasLink && addLinkToElement(svgElement, attributes?.link?.toString());
      updateSvgElementRecursive(svgElement, [hasLabel, label], [hasLabelColor, labelColor], elementColors);
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

function updateSvgElementRecursive(
  element: Element,
  label: [boolean, string | undefined],
  labelColor: [boolean, string | undefined],
  elColor?: ReturnType<typeof getElementColor>
): void {
  const hasChildren = element.children.length > 0;

  if (elColor && element instanceof SVGElement) {
    if (element.tagName !== 'foreignObject' && !element.querySelector('text')) {
      applyColorToElement(element, elColor);
    }
  }

  if (element instanceof SVGTextElement || element instanceof HTMLElement) {
    const [hasLabelColor, color] = labelColor;
    hasLabelColor && applyColorToText(element, color);

    const [hasLabel, text] = label;
    hasLabel && applyTextForTextElement(element, text);
  }

  if (hasChildren) {
    for (const child of element.children) {
      updateSvgElementRecursive(child, label, labelColor, elColor);
    }
  }
}

function applyColorToElement(element: SVGElement, [fill, stroke, opacity]: ReturnType<typeof getElementColor>): void {
  if (!element.hasAttribute('data-original-fill')) {
    element.setAttribute('data-original-fill', element.getAttribute('fill') || '');
    element.setAttribute('data-original-stroke', element.getAttribute('stroke') || '');
    element.setAttribute('data-original-fill-opacity', element.getAttribute('fill-opacity') || 'false');
  }

  const hasFill = fill && fill !== '';
  const hasStroke = stroke && stroke !== '';
  const hasOpacity = opacity && opacity !== '';

  if (!hasFill && !hasStroke && !hasOpacity) {
    const origFill = element.getAttribute('data-original-fill');
    const origStroke = element.getAttribute('data-original-stroke');
    const origOpacity = element.getAttribute('data-original-fill-opacity');

    origFill && element.setAttribute('fill', origFill);
    origStroke && element.setAttribute('stroke', origStroke);
    origOpacity && element.setAttribute('fill-opacity', origOpacity);
    return;
  }

  element.removeAttribute('style');

  hasFill && element.setAttribute('fill', fill);
  hasStroke && element.setAttribute('stroke', stroke);
  hasOpacity && element.setAttribute('fill-opacity', opacity);
}

function applyColorToText(element: Element, color: string | undefined) {
  const handleSvg = (element: SVGTextElement) => {
    if (!element.hasAttribute('data-original-textColor')) {
      element.setAttribute('data-original-textColor', element.getAttribute('fill') || '');
    }

    if (!color) {
      const origFill = element.getAttribute('data-original-textColor');
      origFill && element.setAttribute('fill', origFill);
      return;
    }

    color && element.setAttribute('fill', color);
  };

  const handleHtml = (element: HTMLElement) => {
    if (!element.hasAttribute('data-original-textColor')) {
      element.setAttribute('data-original-textColor', element.style.color || '');
    }

    if (!color) {
      const origFill = element.getAttribute('data-original-textColor');
      origFill && (element.style.color = origFill);
      return;
    }

    color && (element.style.color = color);
  };

  if (element instanceof SVGTextElement) {
    handleSvg(element);
  } else if (element instanceof HTMLElement) {
    handleHtml(element);
  }
}

function applyTextForTextElement(element: Element, text: string | undefined) {
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE) {
      if (!element.hasAttribute('data-original-text')) {
        element.setAttribute('data-original-text', child.textContent || '');
      }

      if (!text) {
        const origText = element.getAttribute('data-original-text');
        child.textContent = origText;
        break;
      }

      child.textContent = text;
      break;
    }
  }
}

function addLinkToElement(svgElement: SVGElement, link?: string): void {
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

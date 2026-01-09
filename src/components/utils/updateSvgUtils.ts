import { ValueMapping } from 'types';
import { getMappingMatch } from './helpers';

export function getLabelText(
  label: string | undefined,
  metricLabel?: string,
  metricValue?: number,
  displayValue?: string,
  mappings?: ValueMapping[]
): string | undefined {
  if (!label) {
    return undefined;
  }

  let display: string | undefined;
  let content;

  if (mappings && metricValue !== undefined) {
    display = getMappingMatch(mappings, metricValue);
  } else if (metricValue !== undefined) {
    display = displayValue;
  } else {
    display = '';
  }

  switch (label) {
    case 'replace':
      content = display ?? '';
      break;
    case 'legend':
      content = metricLabel || '';
      break;
    case 'colon':
      content = metricLabel ? `${metricLabel}: ${display}` : display;
      break;
    case 'space':
      content = metricLabel ? `${metricLabel} ${display}` : display;
      break;
    default:
      content = label;
      break;
  }

  return content;
}

export function getLabelColor(colorSetting: string | undefined, elementColor?: string): string | undefined {
  if (!colorSetting) {
    return undefined;
  }

  const color = colorSetting === 'metric' ? elementColor : colorSetting;

  if (!color) {
    return '';
  }

  return color;
}

export function getElementColor(
  color: string | undefined,
  filling?: string
): [string | null, string | null, string | null] {
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

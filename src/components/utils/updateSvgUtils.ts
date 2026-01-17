import { VizData } from 'types';

export function getLabel(vizData: VizData | undefined, label: string | undefined): string | undefined {
  if (!label) {
    return undefined;
  }

  if (!vizData) {
    return label;
  }

  const legend = vizData.label.toString();
  const displayValue = vizData.displayValue?.toString() ?? vizData.metricValue.toString();

  switch (label) {
    case 'legend':
      return legend;
    case 'replace':
      return displayValue;
    case 'colon':
      return `${legend}: ${displayValue}`;
    case 'space':
      return `${legend} ${displayValue}`;
    default:
      return label;
  }
}

export function getLabelColor(colorSetting: string | undefined, elementColor?: string): string | undefined {
  if (!colorSetting) {
    return undefined;
  }

  const color = colorSetting === 'metric' ? elementColor : colorSetting;

  return color;
}

export function getElementColor(
  color: string | undefined,
  filling?: string
): [string | null, string | null, string | null] {
  if (!color) {
    return [null, null, null];
  }

  const parsedFilling = filling ? filling.split(',').map((s) => s.trim()) : [];
  const fillingType = parsedFilling[0];
  const opacityValue = parseInt(parsedFilling[1], 10);

  const opacity =
    !isNaN(opacityValue) && opacityValue >= 0 && opacityValue <= 100 ? (opacityValue / 100).toString() : null;

  switch (fillingType) {
    case 'fill':
      return [color, null, opacity];
    case 'stroke':
      return [null, color, opacity];
    case 'none':
      return [null, null, opacity];
    case 'fs':
      return [color, color, opacity];
    default:
      return [color, null, opacity];
  }
}

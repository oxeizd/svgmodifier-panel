import { ConfigRules, MetricData, TableMetricData } from 'components/types';
import { getElementColor, getLabel, getLabelColor } from './helpers';
import { addLinkToElement, updateSvgElementRecursive } from './updater';

export function createSvgUpdateOperation(
  svgElement: SVGElement,
  attributes: ConfigRules['attributes'],
  data: MetricData | TableMetricData
) {
  return () => {
    if (!data) {
      return;
    }

    const hasLink = attributes ? 'link' in attributes : false;
    const hasLabel = attributes ? 'label' in attributes : false;
    const hasLabelColor = attributes ? 'labelColor' in attributes : false;

    const label = getLabel(data, attributes?.label);
    const labelColor = getLabelColor(attributes?.labelColor, data?.color);
    const elementColors = getElementColor(data?.color, data?.filling);

    hasLink && addLinkToElement(svgElement, attributes?.link?.toString());
    updateSvgElementRecursive(svgElement, [hasLabel, label], [hasLabelColor, labelColor], elementColors);
  };
}

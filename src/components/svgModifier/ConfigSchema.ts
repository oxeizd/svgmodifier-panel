import { Metric } from 'components/types';

export function applySchema(attributes: any) {
  const schema = attributes.schema;
  if (!schema) {
    return;
  }

  const schemaActions: Record<string, () => void> = {
    basic: () => {
      delete attributes.label;
      delete attributes.labelColor;
      attributes.tooltip = attributes.tooltip || { show: true };
      attributes.metrics?.forEach((metric: Metric) => {
        metric.filling = 'fill';
        metric.baseColor = metric.baseColor || '#00ff00';
      });
    },
    stroke: () => {
      ['link', 'label', 'labelColor', 'tooltip'].forEach((p) => delete attributes[p]);
      delete attributes.metrics?.baseColor;
      attributes.metrics?.forEach((metric: Metric) => {
        metric.filling = 'stroke';
        metric.baseColor = '';
      });
    },
    strokeBase: () => {
      ['link', 'label', 'labelColor', 'tooltip'].forEach((p) => delete attributes[p]);
      attributes.metrics?.forEach((metric: Metric) => {
        metric.filling = 'stroke';
      });
    },
    text: () => {
      delete attributes.link;
      delete attributes.tooltip;
      attributes.label = attributes.label || 'replace';
      attributes.labelColor = attributes.labelColor || 'metric';
      attributes.metrics?.forEach((metric: Metric) => {
        metric.filling = 'none';
        metric.baseColor = metric.baseColor || '';
      });
    },
    table: () => {
      delete attributes.link;
      delete attributes.tooltip;
      attributes.label = attributes.label || 'replace';
      attributes.labelColor = attributes.labelColor || 'metric';
      attributes.metrics?.forEach((metric: Metric) => {
        metric.filling = 'fill, 20';
        metric.baseColor = metric.baseColor || '#00ff00';
      });
    },
  };

  schemaActions[schema]?.();
}

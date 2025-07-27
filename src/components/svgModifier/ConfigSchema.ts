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
      if (attributes.metrics) {
        attributes.metrics.filling = 'fill';
        attributes.metrics.baseColor = attributes.metrics.baseColor || '#00ff00';
      }
    },
    stroke: () => {
      ['link', 'label', 'labelColor', 'tooltip'].forEach((p) => delete attributes[p]);
      delete attributes.metrics?.baseColor;
      if (attributes.metrics) {
        attributes.metrics.filling = 'stroke';
        attributes.metrics.baseColor = '';
      }
    },
    strokeBase: () => {
      ['link', 'label', 'labelColor', 'tooltip'].forEach((p) => delete attributes[p]);
      if (attributes.metrics) {
        attributes.metrics.filling = 'stroke';
      }
    },
    text: () => {
      delete attributes.link;
      delete attributes.tooltip;
      attributes.label = attributes.label || 'replace';
      attributes.labelColor = attributes.labelColor || 'metric';
      if (attributes.metrics) {
        attributes.metrics.filling = 'none';
        attributes.metrics.baseColor = attributes.metrics.baseColor || '';
      }
    },
    table: () => {
      delete attributes.link;
      delete attributes.tooltip;
      attributes.label = attributes.label || 'replace';
      attributes.labelColor = attributes.labelColor || 'metric';
      if (attributes.metrics) {
        attributes.metrics.filling = 'fill, 20';
        attributes.metrics.baseColor = attributes.metrics.baseColor || '#00ff00';
      }
    },
  };

  schemaActions[schema]?.();
}

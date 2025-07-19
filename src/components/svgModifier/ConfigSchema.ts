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
      if (attributes.metrics?.[0]) {
        attributes.metrics[0].filling = 'fill';
        attributes.metrics[0].baseColor = attributes.metrics[0].baseColor || '#00ff00';
      }
    },
    stroke: () => {
      ['link', 'label', 'labelColor', 'tooltip'].forEach((p) => delete attributes[p]);
      delete attributes.metrics?.baseColor;
      if (attributes.metrics?.[0]) {
        attributes.metrics[0].filling = 'stroke';
        attributes.metrics[0].baseColor = '';
      }
    },
    strokeBase: () => {
      ['link', 'label', 'labelColor', 'tooltip'].forEach((p) => delete attributes[p]);
      if (attributes.metrics?.[0]) {
        attributes.metrics[0].filling = 'stroke';
      }
    },
    text: () => {
      delete attributes.link;
      delete attributes.tooltip;
      attributes.label = attributes.label || 'replace';
      attributes.labelColor = attributes.labelColor || 'metric';
      if (attributes.metrics?.[0]) {
        attributes.metrics[0].filling = 'none';
        attributes.metrics[0].baseColor = attributes.metrics[0].baseColor || '';
      }
    },
    table: () => {
      delete attributes.link;
      delete attributes.tooltip;
      attributes.label = attributes.label || 'replace';
      attributes.labelColor = attributes.labelColor || 'metric';
      if (attributes.metrics?.[0]) {
        attributes.metrics[0].filling = 'fill, 20';
        attributes.metrics[0].baseColor = attributes.metrics[0].baseColor || '#00ff00';
      }
    },
  };

  schemaActions[schema]?.();
}

import { PanelPlugin } from '@grafana/data';
import SvgPanel from './components/svgPanel'; // Импортируем SvgPanel
import { PanelOptions } from './components/types'; // Импортируем PanelOptions из components/types

export const plugin = new PanelPlugin<PanelOptions>(SvgPanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'jsonData.svgCode',
      name: 'SVG Code',
      description: 'Insert your SVG code here',
      defaultValue: '',
      settings: {
        rows: 2,
        useTextarea: true,
      },
    })
    .addTextInput({
      path: 'jsonData.metricsMapping',
      name: 'Metrics Mapping',
      description: 'Enter metrics mapping in Yaml format',
      defaultValue: 'changes:',
      settings: {
        rows: 25,
        useTextarea: true,
        maxLength: 10000,
      },
    });
});

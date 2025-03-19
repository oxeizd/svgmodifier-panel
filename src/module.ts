import { PanelPlugin } from '@grafana/data';
import { PanelOptions } from 'components/types';
import SvgPanel from 'components/svgPanel';
import YamlEditor from 'components/yamlEditor/yamlEditor';

export const plugin = new PanelPlugin<PanelOptions>(SvgPanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'jsonData.svgCode',
      name: 'SVG Code',
      settings: {
        rows: 2,
        useTextarea: true,
      },
    })
    .addCustomEditor({
      id: 'metricsMapping',
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
  // .addTextInput({
  //   path: 'jsonData.Alias',
  //   name: 'Aliases',
  //   defaultValue: '',
  //   settings: {
  //     rows: 2,
  //     useTextarea: true,
  //   },
  // });
});

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
        useTextarea: true,
        rows: 2,
      },
    })
    .addCustomEditor({
      id: 'metricsMapping',
      path: 'jsonData.metricsMapping',
      name: 'Metrics Mapping',
      description: 'Enter metrics mapping in Yaml format. CTRL+SPACE for tips',
      editor: YamlEditor,
    })
    .addBooleanSwitch({
      path: 'jsonData.editMode',
      name: 'Editor mode',
      description: 'enable edit mode for SVG ids',
      defaultValue: false,
    });
});

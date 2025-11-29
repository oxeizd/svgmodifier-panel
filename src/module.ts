import SvgPanel from 'components/svgPanel';
import { PanelOptions } from 'types';
import YamlEditor from 'components/yamlEditor/yamlEditor';
import { PanelPlugin, FieldConfigProperty } from '@grafana/data';

export const plugin = new PanelPlugin<PanelOptions>(SvgPanel)
  .setPanelOptions((builder) => {
    return builder
      .addTextInput({
        category: ['Standard options'],
        path: 'jsonData.svgCode',
        name: 'SVG Code',
        description: 'enter your SVG code here',
        settings: {
          rows: 3,
          useTextarea: true,
        },
      })
      .addCustomEditor({
        category: ['Standard options'],
        id: 'metricsMapping',
        path: 'jsonData.metricsMapping',
        name: 'Metrics Mapping',
        description: 'enter metrics mapping in Yaml format. CTRL+SPACE for tips',
        editor: YamlEditor,
      })
      .addSelect({
        category: ['SVG settings'],
        path: 'jsonData.svgAspectRatio',
        name: 'Aspect Ratio',
        description: 'how the SVG should maintain its aspect ratio',
        defaultValue: 'disable',
        settings: {
          options: [
            { value: 'disable', label: 'disable' },
            { value: 'none', label: 'None' },
            { value: 'xMinYMin meet', label: 'Meet (preserve)' },
            { value: 'xMidYMid meet', label: 'Meet (center)' },
            { value: 'xMaxYMax meet', label: 'Meet (end)' },
            { value: 'xMinYMin slice', label: 'Slice' },
          ],
        },
      })
      .addTextInput({
        category: ['Relative time'],
        path: 'jsonData.customRelativeTime',
        name: 'Custom relative time',
        description: 'time format for all fields (e.g., 2h30m, 1d6h)',
        defaultValue: '',
        settings: {
          placeholder: '30m',
        },
      })
      .addTextInput({
        category: ['Relative time'],
        path: 'jsonData.fieldsCustomRelativeTime',
        name: 'Field relative time',
        description: 'field time format (e.g., A: 2h30m, B: 1d6h)',
        defaultValue: '',
        settings: {
          rows: 2,
          useTextarea: true,
          placeholder: 'A,B,C,D: 30m; B: 15m;',
        },
      });
  })
  .useFieldConfig({
    disableStandardOptions: Object.values(FieldConfigProperty),
  });

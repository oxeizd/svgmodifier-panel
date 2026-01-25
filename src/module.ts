import { PanelPlugin, FieldConfigProperty } from '@grafana/data';
import { PanelOptions } from 'types';
import SvgPanel from 'components/svgPanel';
import YamlEditor from 'components/editors/yamlEditor/yamlEditor';
import { ExpressionsEditor } from 'components/editors/expEditor/expEditor';

export const plugin = new PanelPlugin<PanelOptions>(SvgPanel)
  .setPanelOptions((builder) => {
    return builder
      .addTextInput({
        category: ['SVG settings'],
        path: 'jsonData.svgCode',
        name: 'SVG',
        description: 'Enter your SVG',
        settings: {
          rows: 3,
          useTextarea: true,
        },
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
      .addCustomEditor({
        category: ['Metrics mapping'],
        id: 'metricsMapping',
        path: 'jsonData.metricsMapping',
        name: 'Config',
        description: 'Create your config. use CTRL+SPACE for tips',
        editor: YamlEditor,
      })
      .addTextInput({
        category: ['Transformations'],
        path: 'jsonData.customRelativeTime',
        name: 'Custom relative time',
        description: 'time format for all fields (e.g., 2h30m, 1d6h)',
        defaultValue: '',
        settings: {
          placeholder: '30m',
        },
      })
      .addTextInput({
        category: ['Transformations'],
        path: 'jsonData.fieldsCustomRelativeTime',
        name: 'Field relative time',
        description: 'field time format (e.g., A: 2h30m, B: 1d6h)',
        defaultValue: '',
        settings: {
          rows: 2,
          useTextarea: true,
          placeholder: 'A,B,C,D: 30m; B: 15m;',
        },
      })
      .addCustomEditor({
        category: ['Transformations'],
        id: 'expressionsEditor',
        path: 'transformations.expressions',
        name: 'Expressions',
        description: 'Math operations on one or more queries',
        defaultValue: [],
        editor: ExpressionsEditor,
      })
      .addRadio({
        category: ['Tooltip'],
        path: 'tooltip.sort',
        name: 'Values sort order',
        defaultValue: 'none',
        settings: {
          options: [
            { value: 'none', label: 'None' },
            { value: 'ascending', label: 'Ascending' },
            { value: 'descending', label: 'Descending' },
          ],
        },
      })
      .addNumberInput({
        category: ['Tooltip'],
        path: 'tooltip.maxWidth',
        name: 'Max width',
        defaultValue: 500,
        settings: {
          integer: true,
        },
      })
      .addRadio({
        category: ['Tooltip'],
        path: 'tooltip.valuePosition',
        name: 'Value position',
        defaultValue: 'standard',
        settings: {
          options: [
            { value: 'standard', label: 'Standard' },
            { value: 'right', label: 'Right' },
          ],
        },
      })
      .addBooleanSwitch({
        category: ['Tooltip'],
        path: 'tooltip.hideZeros',
        name: 'Hide zeros',
        defaultValue: false,
      });
  })
  .useFieldConfig({
    disableStandardOptions: Object.values(FieldConfigProperty),
  });

import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

export type SuggestionItem = {
  label: string;
  insertText: string;
  documentation?: string;
};

export type EditorContext = {
  currentIndent: number;
  lineContent: string;
  prevLine: string;
  position: monacoEditor.Position;
  model: monacoEditor.editor.ITextModel;
  lines?: string[];
};

/**
 * monacoEditor options
 */
export const MONACO_OPTIONS: monacoEditor.editor.IStandaloneEditorConstructionOptions = {
  // Базовые настройки
  lineNumbers: 'on',
  lineNumbersMinChars: 3,
  tabSize: 2,
  insertSpaces: true,
  minimap: { enabled: false },
  wordWrap: 'off',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  // Автодополнение
  suggest: {
    showWords: false,
    showSnippets: true,
  },
  quickSuggestions: {
    other: false,
    comments: false,
    strings: false,
  },
  // Автозакрывание
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
};

/**
 * schama templates
 */
export const SUGGESTION_TEMPLATES = {
  DEFAULT_TEMPLATE: 'changes:\n  ',

  CHANGES: "- id: '${1}'\n  attributes:\n    ",

  // attributes
  LINK: "link: ''",
  TOOLTIP: 'tooltip:\n  show: true',
  LABEL: "label: 'replace'",
  LABEL_COLOR: "labelColor: 'metric'",
  AUTO_CONFIG: 'autoConfig: true',
  LABEL_MAPPING: "valueMapping:\n  - { condition: '${1|>=,>,<,=,!=,<=|}', value: ${2}, label: '${3}' }",
  ADD_MAPPING: "- { condition: '${1|>=,>,<,=,!=,<=|}', value: ${2}, label: '${3}' }",
  METRICS: 'metrics:\n  ',

  // metrics
  REFIDS: "refIds:\n  - { refid: '${1}' }",
  LEGENDS: "legends:\n  - { legend: '${1}' }",
  ADD_LEGEND: "- { legend: '${1}' }",
  ADD_REFID: "- { refid: '${1}' }",
  DECIMAL: 'decimal: 0',
  BASE_COLOR: "baseColor: 'rgba(50, 172,45, 0.97)'",
  FILLING: "filling: '${1|fill,stroke,fs,fill\\, 20,none|}'",
  DISPLAY_TEXT: "displayText: '${1}'",
  THRESHOLDS: "thresholds:\n  - { color: 'orange', value: 10 }\n  - { color: 'red', value: 20 }",
  ADD_THRESHOLD: "- { color: '', value:  }",

  // refs params
  FILTER: "filter: '${1| ,$date,$dateN|}'",
  LABEL_METRIC: "label: '${1}'",
  SUM: "sum: '${1}'",
  UNIT: "unit: '${1|seconds,milliseconds,bytes,percent,percent(0-1)|}'",
  CALCULATION: "calculation: '${1|last,total,max,min,count,delta|}'",

  // Thresholds
  LVL: 'lvl: ${1}',
  OPERATOR: "operator: '${1|=,>,<,>=,!=,<=|}'",
  CONDITION: "condition: '${1|hour >= 9 && hour < 18 && day !== 0 && day !== 6|}'",

  // defs
  DEF_CONFIG:
    `- id: ''\n  attributes:\n    tooltip:\n      show: true\n    metrics:\n      refIds:\n` +
    `       - { refid: '' }\n      baseColor: '#00ff00'\n      thresholds:\n        - { color: 'orange', value: 10 }`,
  THRESHOLDS_ROOT: `thresholds:\n  name: &name\n  - { color: 'orange', value: 10 }\n  - { color: 'red', value: 20 }`,
} as const;

export const SUGGESTION_GROUPS = {
  ROOT: [{ label: 'thresholds', insertText: SUGGESTION_TEMPLATES.THRESHOLDS_ROOT }],

  CHANGES: [{ label: 'id', insertText: SUGGESTION_TEMPLATES.CHANGES }],

  DEFS: [{ label: 'defConfig', insertText: SUGGESTION_TEMPLATES.DEF_CONFIG }],

  ATTRIBUTES: [
    { label: 'link', insertText: SUGGESTION_TEMPLATES.LINK },
    { label: 'tooltip', insertText: SUGGESTION_TEMPLATES.TOOLTIP },
    { label: 'label', insertText: SUGGESTION_TEMPLATES.LABEL },
    { label: 'labelColor', insertText: SUGGESTION_TEMPLATES.LABEL_COLOR },
    { label: 'autoConfig', insertText: SUGGESTION_TEMPLATES.AUTO_CONFIG },
    { label: 'valueMapping', insertText: SUGGESTION_TEMPLATES.LABEL_MAPPING },
    { label: 'add mapping', insertText: SUGGESTION_TEMPLATES.ADD_MAPPING },
    { label: 'metrics', insertText: SUGGESTION_TEMPLATES.METRICS },
  ],

  METRICS: [
    { label: 'refIds', insertText: SUGGESTION_TEMPLATES.REFIDS },
    { label: 'legends', insertText: SUGGESTION_TEMPLATES.LEGENDS },
    { label: 'add legend', insertText: SUGGESTION_TEMPLATES.ADD_LEGEND },
    { label: 'add refid', insertText: SUGGESTION_TEMPLATES.ADD_REFID },
    { label: 'decimal', insertText: SUGGESTION_TEMPLATES.DECIMAL },
    { label: 'baseColor', insertText: SUGGESTION_TEMPLATES.BASE_COLOR },
    { label: 'filling', insertText: SUGGESTION_TEMPLATES.FILLING },
    { label: 'displayText', insertText: SUGGESTION_TEMPLATES.DISPLAY_TEXT },
    { label: 'thresholds', insertText: SUGGESTION_TEMPLATES.THRESHOLDS },
    { label: 'add threshold', insertText: SUGGESTION_TEMPLATES.ADD_THRESHOLD },
  ],

  LEGEND: [
    { label: 'filter', insertText: SUGGESTION_TEMPLATES.FILTER },
    { label: 'label', insertText: SUGGESTION_TEMPLATES.LABEL_METRIC },
    { label: 'sum', insertText: SUGGESTION_TEMPLATES.SUM },
    { label: 'unit', insertText: SUGGESTION_TEMPLATES.UNIT },
    { label: 'calculation', insertText: SUGGESTION_TEMPLATES.CALCULATION },
  ],

  THRESHOLD: [
    { label: 'lvl', insertText: SUGGESTION_TEMPLATES.LVL },
    { label: 'operator', insertText: SUGGESTION_TEMPLATES.OPERATOR },
    { label: 'condition', insertText: SUGGESTION_TEMPLATES.CONDITION },
  ],
} as const;

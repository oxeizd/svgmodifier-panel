import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

type SuggestionItem = {
  label: string;
  insertText: string;
};

type EditorContext = {
  currentIndent: number;
  lineContent: string;
  prevLine: string;
  position: monacoEditor.Position;
  model: monacoEditor.editor.ITextModel;
};

// Вспомогательная функция для проверки наличия строки `- id:` выше текущей строки
export const findIdAbove = (model: monacoEditor.editor.ITextModel, currentLine: number): boolean => {
  for (let i = currentLine - 1; i >= 1; i--) {
    if (model.getLineContent(i).includes('- id:')) {
      return true;
    }
  }
  return false;
};

// Вспомогательная функция для проверки наличия правила в блоке `id`
export const ruleExistsInIdBlock = (
  model: monacoEditor.editor.ITextModel,
  position: monacoEditor.Position,
  rule: string,
  direction: 'above' | 'below' | 'both' = 'both',
  linesToCheck = Infinity,
  checkAll = false
): boolean => {
  const currentLine = position.lineNumber;

  if (checkAll) {
    const totalLines = model.getLineCount();

    if (direction === 'above' || direction === 'both') {
      for (let i = currentLine - 1; i >= 1; i--) {
        if (model.getLineContent(i).includes(`${rule}:`)) {
          return true;
        }
      }
    }

    if (direction === 'below' || direction === 'both') {
      for (let j = currentLine + 1; j <= totalLines; j++) {
        if (model.getLineContent(j).includes(`${rule}:`)) {
          return true;
        }
      }
    }

    return false;
  }

  let startLine = currentLine;

  if (direction === 'above' || direction === 'both') {
    let linesChecked = 0;
    while (startLine > 1 && linesChecked < linesToCheck) {
      if (model.getLineContent(startLine).includes('- id:')) {
        break;
      }
      startLine--;
      linesChecked++;
    }

    for (let i = startLine; i <= currentLine; i++) {
      if (model.getLineContent(i).includes(`${rule}:`)) {
        return true;
      }
    }
  }

  if (direction === 'below' || direction === 'both') {
    const totalLines = model.getLineCount();
    let linesChecked = 0;
    for (let j = currentLine + 1; j <= totalLines && linesChecked < linesToCheck; j++) {
      if (model.getLineContent(j).includes('- id:')) {
        break;
      }
      if (model.getLineContent(j).includes(`${rule}:`)) {
        return true;
      }
      linesChecked++;
    }
  }

  return false;
};

// Вспомогательная функция для проверки условий позиции курсора
export const isConditionMet = (ctx: EditorContext, pos: number) => {
  const lineContent = ctx.lineContent;
  const column = ctx.position.column;

  const isRightEmpty = lineContent.substring(column - 1).trim() === '';

  return ctx.position.column === pos && isRightEmpty;
};

// Вспомогательная функция для проверки, заканчивается ли строка запятой
const isAfterComma = (lineContent: string, column: number) => {
  const leftText = lineContent.substring(0, column);
  return /,\s*$/.test(leftText);
};

// Вспомогательная функция для проверки, находится ли курсор внутри блока legend
const isInLegendBlock = (lineContent: string, column: number) => {
  const leftText = lineContent.substring(0, column);
  return /(legend|refid)\s*:\s*['"]/.test(leftText);
};

// Основная схема конфигурации
export const configSchema = [
  {
    key: 'id',
    indent: 2,
    condition: (ctx: EditorContext) =>
      isConditionMet(ctx, 3) && ruleExistsInIdBlock(ctx.model, ctx.position, 'changes', 'above', Infinity, true),
    items: [{ label: 'id', insertText: "- id: '${1}'\n  attributes:\n    " }],
  },
  {
    key: 'attributes',
    condition: (ctx: EditorContext) => {
      const hasIdAbove = findIdAbove(ctx.model, ctx.position.lineNumber);
      const hasAttributes = ruleExistsInIdBlock(ctx.model, ctx.position, 'attributes', 'above');
      const hasMetrics = ruleExistsInIdBlock(ctx.model, ctx.position, 'metrics', 'above');
      return hasIdAbove && hasAttributes && !hasMetrics;
    },
    items: (ctx: EditorContext): SuggestionItem[] => {
      const allItems: SuggestionItem[] = [
        { label: 'link', insertText: "link: ''" },
        { label: 'tooltip', insertText: 'tooltip:\n  show: true' },
        { label: 'label', insertText: "label: 'replace'" },
        { label: 'labelColor', insertText: "labelColor: 'metric'" },
        { label: 'autoConfig', insertText: 'autoConfig: true' },
        {
          label: 'labelMapping',
          insertText: "labelMapping:\n  - { condition: '${1|>=,>,<,=,!=,<=|}', value: ${2}, label: '${3}' }",
        },
        { label: 'add mapping', insertText: "- { condition: '${1|>=,>,<,=,!=,<=|}', value: ${2}, label: '${3}' }" },
        { label: 'metrics', insertText: 'metrics:\n  ' },
      ];

      return allItems.filter((item) => {
        const exists = ruleExistsInIdBlock(ctx.model, ctx.position, item.label, 'both');
        if (item.label === 'add mapping') {
          return (
            !exists &&
            ctx.position.column === 9 &&
            ruleExistsInIdBlock(ctx.model, ctx.position, 'labelMapping') &&
            ruleExistsInIdBlock(ctx.model, ctx.position, '- { condition', 'both', 1)
          );
        }
        return !exists && ctx.position.column === 7;
      });
    },
  },
  {
    condition: (ctx: EditorContext) => {
      return (
        isAfterComma(ctx.lineContent, ctx.position.column) && isInLegendBlock(ctx.lineContent, ctx.position.column)
      );
    },
    items: (ctx: EditorContext): SuggestionItem[] => {
      const leftText = ctx.lineContent.substring(0, ctx.position.column);

      const allItems: SuggestionItem[] = [
        { label: 'filter', insertText: "filter: '${1| ,$date,$dateN|}'" },
        { label: 'label', insertText: "label: '${1}'" },
        { label: 'sum', insertText: "sum: '${1}'" },
        { label: 'unit', insertText: "unit: '${1|seconds,milliseconds,bytes,percent,percent(0-1)|}'" },
        { label: 'calculation', insertText: "calculation: '${1|last,total,max,min,count,delta|}'" },
      ];

      return allItems.filter((item) => !new RegExp(`${item.label}:`).test(leftText));
    },
  },
  {
    key: 'metrics',
    condition: (ctx: EditorContext) => {
      const validColumns = [9, 11, 13, 14];
      return (
        validColumns.includes(ctx.position.column) &&
        findIdAbove(ctx.model, ctx.position.lineNumber) &&
        ruleExistsInIdBlock(ctx.model, ctx.position, 'metrics', 'above')
      );
    },
    items: (ctx: EditorContext): SuggestionItem[] => {
      const allItems: SuggestionItem[] = [
        { label: 'refIds', insertText: "- refIds:\n  - { refid: '${1}' }" },
        { label: 'legends', insertText: "- legends:\n  - { legend: '${1}' }" },
        { label: 'additional refIds', insertText: "refIds:\n   - { refid: '${1}' }" },
        { label: 'additional legends', insertText: "legends:\n   - { legend: '${1}' }" },
        { label: 'add legend', insertText: "- { legend: '${1}' }" },
        { label: 'add refid', insertText: "- { refid: '${1}' }" },
        { label: 'decimal', insertText: 'decimal: 0' },
        { label: 'baseColor', insertText: "baseColor: '#00ff00'" },
        { label: 'filling', insertText: "filling: '${1|fill,stroke,fs,fill\\, 20,none|}'" },
        { label: 'displayText', insertText: "displayText: '${1}'" },
        {
          label: 'thresholds',
          insertText: "thresholds:\n  - { color: 'orange', value: 10 }\n  - { color: 'red', value: 20 }",
        },
        { label: 'add threshold', insertText: "- { color: '', value:  }" },
      ];

      return allItems.filter((item) => {
        const exists = ruleExistsInIdBlock(ctx.model, ctx.position, item.label, 'both');

        if (item.label === 'refIds' || item.label === 'legends') {
          return (
            !exists && ctx.position.column === 9 && ruleExistsInIdBlock(ctx.model, ctx.position, 'metrics', 'above', 1)
          );
        }

        if (item.label === 'additional refIds') {
          return (
            !exists &&
            ctx.position.column === 11 &&
            ruleExistsInIdBlock(ctx.model, ctx.position, '- legends', 'above') &&
            ruleExistsInIdBlock(ctx.model, ctx.position, 'legend', 'above', 1) &&
            !ruleExistsInIdBlock(ctx.model, ctx.position, 'refIds')
          );
        }

        if (item.label === 'additional legends') {
          return (
            !exists &&
            ctx.position.column === 11 &&
            ruleExistsInIdBlock(ctx.model, ctx.position, '- refIds', 'above') &&
            ruleExistsInIdBlock(ctx.model, ctx.position, 'refid', 'above', 1) &&
            !ruleExistsInIdBlock(ctx.model, ctx.position, 'legends')
          );
        }

        if (item.label === 'add legend') {
          return (
            !exists &&
            ((ctx.position.column === 11 &&
              ruleExistsInIdBlock(ctx.model, ctx.position, '- legends', 'above') &&
              ruleExistsInIdBlock(ctx.model, ctx.position, 'legend', 'both', 1)) ||
              (ctx.position.column === 14 &&
                ruleExistsInIdBlock(ctx.model, ctx.position, '          legends', 'above') &&
                ruleExistsInIdBlock(ctx.model, ctx.position, 'legend', 'both', 1)))
          );
        }

        if (item.label === 'add refid') {
          return (
            !exists &&
            ((ctx.position.column === 11 &&
              ruleExistsInIdBlock(ctx.model, ctx.position, '- refIds', 'above') &&
              ruleExistsInIdBlock(ctx.model, ctx.position, 'refid', 'both', 1)) ||
              (ctx.position.column === 14 &&
                ruleExistsInIdBlock(ctx.model, ctx.position, '          refIds', 'above') &&
                ruleExistsInIdBlock(ctx.model, ctx.position, 'refid', 'both', 1)))
          );
        }

        if (item.label === 'add threshold') {
          return (
            !exists &&
            ctx.position.column === 13 &&
            ruleExistsInIdBlock(ctx.model, ctx.position, 'thresholds', 'above') &&
            ruleExistsInIdBlock(ctx.model, ctx.position, '- { color', 'both', 1)
          );
        }

        return (
          !exists &&
          ctx.position.column === 11 &&
          (ruleExistsInIdBlock(ctx.model, ctx.position, 'legends', 'above') ||
            ruleExistsInIdBlock(ctx.model, ctx.position, 'refIds', 'above'))
        );
      });
    },
  },
  {
    condition: (ctx: EditorContext) => {
      return isAfterComma(ctx.lineContent, ctx.position.column) && /-\s*{[^}]*\bcolor\s*:/.test(ctx.lineContent);
    },
    items: (ctx: EditorContext): SuggestionItem[] => {
      const allItems: SuggestionItem[] = [
        { label: 'lvl', insertText: 'lvl: ${1}' },
        { label: 'operator', insertText: "operator: '${1|=,>,<,>=,!=,<=|}'" },
        { label: 'condition', insertText: "condition: '${1|hour >= 9 && hour < 18 && day !== 0 && day !== 6|}'" },
      ];

      return allItems.filter((item) => !new RegExp(`${item.label}:`).test(ctx.lineContent));
    },
  },
  {
    key: 'defConfig',
    condition: (ctx: EditorContext) =>
      isConditionMet(ctx, 3) && ruleExistsInIdBlock(ctx.model, ctx.position, 'changes', 'above', Infinity, true),
    items: [
      {
        label: 'defConfig',
        insertText: `- id: ''
  attributes:
    tooltip:
      show: true
    metrics:
      - refIds:
        - { refid: '' }
        baseColor: '#00ff00'
        thresholds:
          - { color: 'orange', value: 10 }
          - { color: 'red', value: 20 }`,
      },
    ],
  },
  {
    key: 'tableConfig',
    condition: (ctx: EditorContext) =>
      isConditionMet(ctx, 3) && ruleExistsInIdBlock(ctx.model, ctx.position, 'changes', 'above', Infinity, true),
    items: [
      {
        label: 'tableConfig',
        insertText: `- id: ''
  attributes:
    label: 'replace'
    labelColor: 'metric'
    metrics:
      - refIds:
        - { refid: '' }
        baseColor: '#00ff00'
        filling: 'none'
        thresholds:
          - { color: 'orange', value: 10 }
          - { color: 'red', value: 20 }`,
      },
    ],
  },
  {
    key: 'thresholds',
    condition: (ctx: EditorContext) =>
      isConditionMet(ctx, 1) &&
      !ruleExistsInIdBlock(ctx.model, ctx.position, 'changes', 'above', Infinity, true) &&
      ruleExistsInIdBlock(ctx.model, ctx.position, 'changes', 'below', Infinity, true) &&
      !ruleExistsInIdBlock(ctx.model, ctx.position, 'thresholds', 'both'),
    items: [
      {
        label: 'thresholds',
        insertText: `thresholds:
  name: &name
  - { color: 'orange', value: 10 }
  - { color: 'red', value: 20 }`,
      },
    ],
  },
  {
    key: 'add threshold',
    condition: (ctx: EditorContext) =>
      isConditionMet(ctx, 3) &&
      ruleExistsInIdBlock(ctx.model, ctx.position, 'thresholds', 'above') &&
      !ruleExistsInIdBlock(ctx.model, ctx.position, 'changes', 'above', Infinity, true),
    items: [
      {
        label: 'add threshold',
        insertText: `name: &name
- { color: 'orange', value: 10 }
- { color: 'red', value: 20 }`,
      },
    ],
  },
];

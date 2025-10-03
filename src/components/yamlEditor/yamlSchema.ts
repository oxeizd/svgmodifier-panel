import { SUGGESTION_GROUPS, EditorContext, SuggestionItem } from './constants';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

// Вспомогательная функция для проверки наличия строки `- id:` выше текущей строки
export const findIdAbove = (model: monacoEditor.editor.ITextModel, currentLine: number): boolean => {
  for (let i = currentLine - 1; i >= 1; i--) {
    if (model.getLineContent(i).indexOf('- id:') !== -1) {
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
  const totalLines = model.getLineCount();

  const checkLines = (start: number, end: number, step: number) => {
    for (let i = start; i !== end; i += step) {
      if (model.getLineContent(i).includes(`${rule}:`)) {
        return true;
      }
    }
    return false;
  };

  if (checkAll) {
    if (direction === 'above' || direction === 'both') {
      if (checkLines(currentLine - 1, 0, -1)) {
        return true;
      }
    }
    if (direction === 'below' || direction === 'both') {
      if (checkLines(currentLine + 1, totalLines + 1, 1)) {
        return true;
      }
    }
    return false;
  }

  if (direction === 'above' || direction === 'both') {
    let linesChecked = 0;
    for (let i = currentLine - 1; i >= 1 && linesChecked < linesToCheck; i--) {
      if (model.getLineContent(i).includes('- id:')) {
        break;
      }
      if (model.getLineContent(i).includes(`${rule}:`)) {
        return true;
      }
      linesChecked++;
    }
  }

  if (direction === 'below' || direction === 'both') {
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
  const { lineContent, position } = ctx;
  const isRightEmpty = lineContent.substring(position.column - 1).trim() === '';

  return position.column === pos && isRightEmpty;
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
    items: SUGGESTION_GROUPS.CHANGES,
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
      const allItems: SuggestionItem[] = [...SUGGESTION_GROUPS.ATTRIBUTES];

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

      const allItems: SuggestionItem[] = [...SUGGESTION_GROUPS.LEGEND];

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
      const allItems: SuggestionItem[] = [...SUGGESTION_GROUPS.METRICS];

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
      const allItems: SuggestionItem[] = [...SUGGESTION_GROUPS.THRESHOLD];

      return allItems.filter((item) => !new RegExp(`${item.label}:`).test(ctx.lineContent));
    },
  },
  {
    key: 'defConfig',
    condition: (ctx: EditorContext) =>
      isConditionMet(ctx, 3) && ruleExistsInIdBlock(ctx.model, ctx.position, 'changes', 'above', Infinity, true),
    items: [...SUGGESTION_GROUPS.DEFS],
  },
  {
    key: 'thresholds',
    condition: (ctx: EditorContext) =>
      isConditionMet(ctx, 1) &&
      !ruleExistsInIdBlock(ctx.model, ctx.position, 'changes', 'above', Infinity, true) &&
      ruleExistsInIdBlock(ctx.model, ctx.position, 'changes', 'below', Infinity, true) &&
      !ruleExistsInIdBlock(ctx.model, ctx.position, 'thresholds', 'both'),
    items: [...SUGGESTION_GROUPS.ROOT],
  },
];

import { SUGGESTION_GROUPS, EditorContext, SuggestionItem } from './constants';

interface BlockAnalysis {
  hasIdAbove: boolean;
  existingRules: Set<string>;
  hasAttributes: boolean;
  hasMetrics: boolean;
  hasChanges: boolean;
  hasThresholds: boolean;
  currentBlockRules: Set<string>;
  lineContents: string[];
  blockStart: number;
  blockEnd: number;
  attributesBlockStart: number;
  attributesBlockEnd: number;
}

const analyzeBlockContext = (ctx: EditorContext): BlockAnalysis => {
  const existingRules = new Set<string>();
  const currentBlockRules = new Set<string>();

  const lineContents =
    ctx.lines ?? Array.from({ length: ctx.model.getLineCount() }, (_, i) => ctx.model.getLineContent(i + 1));

  const currentLine = Math.max(0, ctx.position.lineNumber - 1);
  let blockStart = -1;
  let blockEnd = lineContents.length;
  let attributesBlockStart = -1;
  let attributesBlockEnd = lineContents.length;

  // Найти ближайший вверх '- id:'
  for (let i = currentLine; i >= 0; i--) {
    if (/^\s*-\s*id:/.test(lineContents[i])) {
      blockStart = i;
      break;
    }
  }

  // Найти следующий '- id:' вниз
  for (let i = currentLine + 1; i < lineContents.length; i++) {
    if (/^\s*-\s*id:/.test(lineContents[i])) {
      blockEnd = i;
      break;
    }
  }

  // Найти attributes: внутри найденного блока (если есть)
  if (blockStart !== -1) {
    for (let i = blockStart; i < blockEnd; i++) {
      if (/^\s*attributes:/.test(lineContents[i])) {
        attributesBlockStart = i;
        const baseIndentMatch = lineContents[i].match(/^(\s*)/);
        const baseIndent = baseIndentMatch ? baseIndentMatch[1].length : 0;
        // определить конец attributes: — либо следующий ключ с indent <= baseIndent, либо следующий '- id:'
        for (let j = i + 1; j < lineContents.length; j++) {
          if (/^\s*-\s*id:/.test(lineContents[j])) {
            attributesBlockEnd = j;
            break;
          }
          const m = lineContents[j].match(/^(\s*)([^\s].*)/);
          if (m) {
            const indent = m[1].length;
            const rest = m[2];
            if (/^[\w-]+:/.test(rest) && indent <= baseIndent) {
              attributesBlockEnd = j;
              break;
            }
          }
        }
        break;
      }
    }
  }

  // Собираем правила: глобально и в текущем блоке (между blockStart..blockEnd)
  let hasChanges = false;
  let hasThresholds = false;
  let hasMetrics = false;
  let hasAttributes = false;

  for (let i = 0; i < lineContents.length; i++) {
    const line = lineContents[i];
    const keyMatch = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:/);
    if (keyMatch) {
      const ruleName = keyMatch[1];
      existingRules.add(ruleName);

      if (blockStart !== -1 && i >= blockStart && i < blockEnd) {
        currentBlockRules.add(ruleName);
        if (ruleName === 'attributes') {
          hasAttributes = true;
        }
      }

      if (attributesBlockStart !== -1 && i >= attributesBlockStart && i < attributesBlockEnd) {
        if (ruleName === 'metrics') {
          hasMetrics = true;
        }
      }

      if (ruleName === 'changes') {
        hasChanges = true;
      }
      if (ruleName === 'thresholds') {
        hasThresholds = true;
      }
    }
  }

  return {
    hasIdAbove: blockStart !== -1,
    existingRules,
    hasAttributes,
    hasMetrics,
    hasChanges,
    hasThresholds,
    currentBlockRules,
    lineContents,
    blockStart,
    blockEnd,
    attributesBlockStart,
    attributesBlockEnd,
  };
};

// Вспомогательная функция для проверки условий позиции курсора
export const isConditionMet = (ctx: EditorContext, pos: number) => {
  const { lineContent, position } = ctx;
  const isRightEmpty = lineContent.substring(position.column - 1).trim() === '';
  return position.column === pos && isRightEmpty;
};

// Функция для проверки существования правила в attributes блоке (учитывает inline объекты)
const ruleExistsInAttributesBlock = (analysis: BlockAnalysis, rule: string): boolean => {
  if (analysis.currentBlockRules.has(rule)) {
    return true;
  }

  if (analysis.attributesBlockStart !== -1) {
    for (let i = analysis.attributesBlockStart; i < analysis.attributesBlockEnd; i++) {
      const line = analysis.lineContents[i];
      if (new RegExp(`(^|[\\s{,])${rule}\\s*:`).test(line)) {
        return true;
      }
      // inline объект вида "- { legend: 'x', calculation: 'y' }"
      if (/\{\s*[^}]*\}/.test(line) && new RegExp(`${rule}\\s*:`).test(line)) {
        return true;
      }
    }
  }

  return false;
};

// Проверка, находится ли позиция внутри блока metrics (в пределах attributes)
const isInMetricsBlockForPosition = (analysis: BlockAnalysis, posLineIndex: number) => {
  if (analysis.attributesBlockStart === -1) {
    return false;
  }
  for (let i = analysis.attributesBlockStart; i < analysis.attributesBlockEnd; i++) {
    if (/^\s*metrics:/.test(analysis.lineContents[i])) {
      const metricsLine = i;
      return posLineIndex >= metricsLine && posLineIndex < analysis.attributesBlockEnd;
    }
  }
  return false;
};

export const configSchema = [
  {
    key: 'id',
    indent: 2,
    condition: (ctx: EditorContext) => {
      const analysis = analyzeBlockContext(ctx);
      // Показываем id если находимся в блоке changes или создаем новый блок
      const isInChangesBlock = analysis.lineContents.some(
        (line, idx) => line.includes('changes:') && idx < ctx.position.lineNumber - 1
      );
      return isConditionMet(ctx, 3) && isInChangesBlock;
    },
    items: SUGGESTION_GROUPS.CHANGES,
  },
  {
    key: 'attributes',
    condition: (ctx: EditorContext) => {
      const analysis = analyzeBlockContext(ctx);
      // Показываем подсказки attributes только если находимся НЕ внутри metrics
      const isInMetricsBlock = analysis.lineContents.some(
        (line, idx) =>
          idx < ctx.position.lineNumber - 1 &&
          line.includes('metrics:') &&
          idx >= analysis.blockStart &&
          idx < analysis.blockEnd
      );

      return analysis.hasIdAbove && analysis.hasAttributes && !isInMetricsBlock;
    },
    items: (ctx: EditorContext): SuggestionItem[] => {
      const analysis = analyzeBlockContext(ctx);
      const allItems: SuggestionItem[] = [...SUGGESTION_GROUPS.ATTRIBUTES];

      return allItems.filter((item) => {
        const exists = analysis.currentBlockRules.has(item.label);
        if (item.label === 'add mapping') {
          return (
            !exists &&
            ctx.position.column === 9 &&
            analysis.currentBlockRules.has('valueMapping') &&
            analysis.lineContents.some((line) => line.includes('- { condition'))
          );
        }
        return !exists && ctx.position.column === 7;
      });
    },
  },
  {
    key: 'metrics',
    condition: (ctx: EditorContext) => {
      const validColumns = [9, 11, 13, 14];
      const analysis = analyzeBlockContext(ctx);

      const isInMetricsBlock = analysis.lineContents.some(
        (line, idx) =>
          idx < ctx.position.lineNumber - 1 &&
          line.includes('metrics:') &&
          idx >= analysis.blockStart &&
          idx < analysis.blockEnd
      );

      return (
        validColumns.includes(ctx.position.column) && analysis.hasIdAbove && analysis.hasAttributes && isInMetricsBlock
      );
    },
    items: (ctx: EditorContext): SuggestionItem[] => {
      const analysis = analyzeBlockContext(ctx);
      const allItems: SuggestionItem[] = [...SUGGESTION_GROUPS.METRICS];

      const currentLine = ctx.position.lineNumber - 1;
      const line = ctx.lineContent;

      // Определяем, внутри ли мы inline-объекта (например "- { legend: '', calculation: '' }")
      let isInsideObject = /\{\s*[^}]*$/.test(line) && !/\}/.test(line);
      if (!isInsideObject) {
        for (let i = currentLine - 1; i >= Math.max(0, currentLine - 10); i--) {
          const l = analysis.lineContents[i];
          if (l.includes('{') && !l.includes('}')) {
            isInsideObject = true;
            break;
          }
          if (l.includes('}')) {
            break;
          }
        }
      }

      // Определяем, внутри ли мы блока metrics (в пределах attributes)
      const isInMetrics = isInMetricsBlockForPosition(analysis, currentLine);

      // Определим, внутри ли массива legends или refIds — ищем ближайшие вверх строки в пределах attributesBlock
      let inQueriesArray = false;
      let inThresholdsArray = false; // Исправлено: было isthresholdsArray

      if (analysis.attributesBlockStart !== -1) {
        for (let i = currentLine; i >= analysis.attributesBlockStart; i--) {
          const l = analysis.lineContents[i].trim();
          if (l.startsWith('queries:')) {
            inQueriesArray = true;
            break;
          }
          if (l.startsWith('thresholds:')) {
            inThresholdsArray = true; // Исправлено: было isthresholdsArray
            break;
          }
          if (l.startsWith('metrics:') && i !== currentLine) {
            break;
          }
        }
      }

      return allItems.filter((item) => {
        // Для inline-объекта проверяем только текущую строку, иначе — в attributes блоке
        const exists = isInsideObject
          ? new RegExp(`(^|[\\s{,])${item.label}\\s*:`).test(line)
          : ruleExistsInAttributesBlock(analysis, item.label);

        // На уровне атрибутов metrics (где refIds:, legends:, decimal:, baseColor и т.д.)
        if (isInMetrics) {
          if (item.label === 'queries') {
            return !exists && ctx.position.column === 9;
          }

          if (['decimal', 'baseColor', 'filling', 'displayText', 'thresholds'].includes(item.label)) {
            return !exists && ctx.position.column === 9;
          }

          // Внутри массива thresholds
          if (inThresholdsArray) {
            // Исправлено: было isthresholdsArray
            if (item.label === 'add threshold') {
              return (
                !exists &&
                ctx.position.column === 11 &&
                ruleExistsInAttributesBlock(analysis, 'thresholds') &&
                analysis.lineContents
                  .slice(analysis.attributesBlockStart, analysis.attributesBlockEnd)
                  .some((l) => /\-\s*\{\s*color\s*:/.test(l))
              );
            }
            // Добавляем свойства thresholds когда находимся внутри массива thresholds
            if (['color', 'value', 'state'].includes(item.label)) {
              const lineBeforeCursor = ctx.lineContent.substring(0, ctx.position.column - 1);
              return !new RegExp(`\\b${item.label}\\s*:`).test(lineBeforeCursor);
            }
          }

          // Внутри массива queries - показываем refId и legends
          if (inQueriesArray) {
            if (item.label === 'add query') {
              return !exists && ctx.position.column === 11 && ruleExistsInAttributesBlock(analysis, 'queries');
            }
            // Показываем refId и legend когда находимся внутри массива queries
            if (['refId', 'legend'].includes(item.label)) {
              const lineBeforeCursor = ctx.lineContent.substring(0, ctx.position.column - 1);
              return !new RegExp(`\\b${item.label}\\s*:`).test(lineBeforeCursor);
            }
          }
          return false;
        }
        return false;
      });
    },
  },

  {
    key: 'inlineMetrics',
    condition: (ctx: EditorContext) => {
      const analysis = analyzeBlockContext(ctx);
      const currentLine = ctx.position.lineNumber - 1;

      // Проверяем, находимся ли мы внутри inline-объекта
      // Даже если есть закрывающая скобка, но курсор перед ней
      const lineBeforeCursor = ctx.lineContent.substring(0, ctx.position.column - 1);
      const isInInlineObject = /\{\s*[^}]*$/.test(lineBeforeCursor);

      if (!isInInlineObject) {
        return false;
      }

      // Проверяем, что находимся в пределах attributes блока
      if (analysis.attributesBlockStart === -1) {
        return false;
      }

      // Определяем, в каком массиве находимся (queries или thresholds)
      let inQueriesArray = false;
      let inThresholdsArray = false;

      for (let i = currentLine; i >= analysis.attributesBlockStart; i--) {
        const line = analysis.lineContents[i].trim();
        if (line.startsWith('queries:')) {
          inQueriesArray = true;
          break;
        }
        if (line.startsWith('thresholds:')) {
          inThresholdsArray = true;
          break;
        }
        if (line.startsWith('metrics:') && i !== currentLine) {
          break;
        }
      }

      return (inQueriesArray || inThresholdsArray) && isInInlineObject;
    },
    items: (ctx: EditorContext): SuggestionItem[] => {
      const analysis = analyzeBlockContext(ctx);
      const currentLine = ctx.position.lineNumber - 1;

      // Определяем, в каком массиве находимся
      let inQueriesArray = false;
      let inThresholdsArray = false;

      for (let i = currentLine; i >= analysis.attributesBlockStart; i--) {
        const line = analysis.lineContents[i].trim();
        if (line.startsWith('queries:')) {
          inQueriesArray = true;
          break;
        }
        if (line.startsWith('thresholds:')) {
          inThresholdsArray = true;
          break;
        }
        if (line.startsWith('metrics:') && i !== currentLine) {
          break;
        }
      }

      if (inQueriesArray) {
        return [...SUGGESTION_GROUPS.QUERY].filter((item) => {
          const lineBeforeCursor = ctx.lineContent.substring(0, ctx.position.column - 1);
          return !new RegExp(`\\b${item.label}\\s*:`).test(lineBeforeCursor);
        });
      } else if (inThresholdsArray) {
        return [...SUGGESTION_GROUPS.THRESHOLD].filter((item) => {
          const lineBeforeCursor = ctx.lineContent.substring(0, ctx.position.column - 1);
          return !new RegExp(`\\b${item.label}\\s*:`).test(lineBeforeCursor);
        });
      }

      return [];
    },
  },

  {
    condition: (ctx: EditorContext) => /-\s*{[^}]*\bcolor\s*:/.test(ctx.lineContent),
    items: (ctx: EditorContext): SuggestionItem[] => {
      const allItems: SuggestionItem[] = [...SUGGESTION_GROUPS.THRESHOLD];
      return allItems.filter((item) => !new RegExp(`${item.label}:`).test(ctx.lineContent));
    },
  },
  {
    key: 'defConfig',
    condition: (ctx: EditorContext) => {
      const analysis = analyzeBlockContext(ctx);
      return isConditionMet(ctx, 3) && analysis.hasChanges;
    },
    items: [...SUGGESTION_GROUPS.DEFS],
  },
  {
    key: 'thresholds',
    condition: (ctx: EditorContext) => {
      const analysis = analyzeBlockContext(ctx);
      const hasChangesBelow = analysis.lineContents.some(
        (line, idx) => idx > ctx.position.lineNumber - 1 && line.includes('changes:')
      );

      return isConditionMet(ctx, 1) && hasChangesBelow && !analysis.hasThresholds;
    },
    items: [...SUGGESTION_GROUPS.ROOT],
  },
];

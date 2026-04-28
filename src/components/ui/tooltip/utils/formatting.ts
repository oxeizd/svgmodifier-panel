import { TooltipContent } from 'components/types';
import { PanelOptions } from 'types';

/**
 * Извлекает уникальные строки из textAbove/textBelow
 */
const getLines = (content: string | string[]): string[] => {
  if (typeof content !== 'string') {
    return content;
  }

  const lines = content
    .replace(/\\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

  return lines;
};

/**
 * Применение параметров Tooltip options
 * Возвращает новый объект, не мутируя исходный
 */
export const processTooltipContent = (
  content: TooltipContent | undefined,
  options: PanelOptions['tooltip']
): TooltipContent | undefined => {
  if (!content) {
    return undefined;
  }

  const processed: TooltipContent = { ...content };

  // Фильтрация нулей в queryData
  if (options.hideZeros && processed.queryData) {
    processed.queryData = processed.queryData.filter((metric) => {
      const numericValue = parseFloat(metric.metric);
      return !isNaN(numericValue) && numericValue !== 0;
    });
  }

  // Сортировка queryData
  if (options.sort !== 'none' && processed.queryData) {
    processed.queryData = [...processed.queryData].sort((a, b) => {
      const aValue = parseFloat(a.metric || '0');
      const bValue = parseFloat(b.metric || '0');
      return isNaN(aValue) || isNaN(bValue) ? 0 : options.sort === 'ascending' ? aValue - bValue : bValue - aValue;
    });
  }

  processed.textAbove = processed.textAbove ? getLines(processed.textAbove) : undefined;
  processed.textBelow = processed.textBelow ? getLines(processed.textBelow) : undefined;

  return processed;
};

/**
 * Форматирование времени для заголовка тултипа
 */
export const formatTimeRange = (timeRange: { to: { valueOf: () => number } }): string => {
  const to = new Date(timeRange.to.valueOf());

  const formatTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  return `${formatTime(to)}`;
};

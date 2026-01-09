import { TimeRange } from '@grafana/data';
import { TooltipContent } from 'types';

export const formatTimeRange = (timeRange: TimeRange): string => {
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

export const processTooltipContent = (
  content: TooltipContent[],
  options: { hideZeros: boolean; sort: string }
): TooltipContent[] => {
  let processed = [...content];

  // Фильтрация нулей
  if (options.hideZeros) {
    processed = processed.filter((item) => {
      const numericValue = parseFloat(item.metric);
      return !isNaN(numericValue) && numericValue !== 0;
    });
  }

  // Сортировка
  if (options.sort !== 'none') {
    processed.sort((a, b) => {
      const aValue = parseFloat(a.metric);
      const bValue = parseFloat(b.metric);

      if (isNaN(aValue) || isNaN(bValue)) {
        return 0;
      }

      if (options.sort === 'ascending') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }

  return processed;
};

export const getUniqueLinesByKey = (content: TooltipContent[], key: 'textAbove' | 'textBelow'): string[] => {
  return Array.from(
    new Set(
      content.reduce<string[]>((acc, item) => {
        const value = item[key];
        if (value) {
          acc.push(...value.replace(/\\n/g, '\n').split('\n'));
        }
        return acc;
      }, [])
    )
  );
};

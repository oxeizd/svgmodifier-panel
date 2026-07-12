import { useMemo } from 'react';
import { ProcessedData } from './usePanelData';
import { GridContent } from 'components/domain/models';

// Проверка firing в fields
const hasFiringInFields = (item: GridContent): boolean => {
  return item.fields?.some((field) => field.lvl > 0) ?? false;
};

// Проверка firing в tables
const hasFiringInTables = (item: GridContent): boolean => {
  return item.tables?.some((table) => (table.lvl ?? 0) > 0) ?? false;
};

// Общая проверка firing
const hasFiring = (item: GridContent): boolean => {
  return hasFiringInFields(item) || hasFiringInTables(item);
};

export const useGridPanel = (processedData: ProcessedData | null, showOnlyFiring: boolean, sortByFiring: boolean) => {
  return useMemo(() => {
    const rawData = processedData?.gridContent || [];
    if (!rawData.length) {
      return [];
    }

    let result = [...rawData]; // Создаем копию, чтобы не мутировать оригинал

    // Фильтрация: оставляем ТОЛЬКО элементы с firing
    if (showOnlyFiring) {
      result = result.filter(hasFiring);
    }

    // Сортировка: firing элементы в начале
    if (sortByFiring) {
      result = result.sort((a, b) => {
        const aFiring = hasFiring(a);
        const bFiring = hasFiring(b);
        if (aFiring === bFiring) {
          return 0;
        }
        return aFiring ? -1 : 1;
      });
    }

    return result;
  }, [processedData?.gridContent, showOnlyFiring, sortByFiring]);
};

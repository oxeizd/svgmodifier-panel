import { matchPattern } from 'components/core/utils';
import { QueriesArray } from './dataHandler';

const FILTER_DELIMITER = ','; // разделяет условия по разным полям (AND)
const VALUE_DELIMITER = '|'; // разделяет значения внутри одного поля (OR)
const TABLE_PREFIX = ':';
const EXCLUSION_PREFIX = '-';
const DATE_FILTER_PREFIX = '$date';
const ISO_DATE_PART_INDEX = 0;

export type FieldFilterMap = {
  include: Record<string, string[]>;
  exclude: Record<string, string[]>;
};

/**
 * @param data - массив данных, который нужно фильтровать
 * @param filter - строка с условиями фильтрации
 * @returns отфильтрованные данные
 */
export function filterData(data: QueriesArray, filter?: FieldFilterMap): QueriesArray {
  if (!filter) {
    return data;
  }

  const result: QueriesArray = {};

  const matchesPattern = (value: string, patterns: string[]): boolean => {
    return patterns.some((pattern) => matchPattern(pattern, value));
  };

  if (data.singleData) {
    result.singleData = data.singleData.filter((item) => {
      // Проверяем include для singleData
      if (filter.include?.['']?.length) {
        // Если ни один паттерн не совпал - убираем
        if (!matchesPattern(item.legend, filter.include[''])) {
          return false;
        }
      }

      // Проверяем exclude для singleData
      if (filter.exclude?.['']?.length) {
        // Если хоть один паттерн совпал - убираем
        if (matchesPattern(item.legend, filter.exclude[''])) {
          return false;
        }
      }

      return true;
    });
  }

  if (data.tableData?.length) {
    result.tableData = data.tableData.map((table) => ({
      headers: table.headers,
      rows: table.rows.filter((row) => {
        if (filter.include) {
          for (const [columnName, patterns] of Object.entries(filter.include)) {
            if (columnName === '') {
              continue;
            }

            const colIndex = table.headers.indexOf(columnName);
            if (colIndex !== -1 && patterns.length) {
              const value = row[colIndex];
              const strValue = String(value);

              if (!matchesPattern(strValue, patterns)) {
                return false;
              }
            }
          }
        }

        if (filter.exclude) {
          for (const [columnName, patterns] of Object.entries(filter.exclude)) {
            if (columnName === '') {
              continue;
            }

            const colIndex = table.headers.indexOf(columnName);
            if (colIndex !== -1 && patterns.length) {
              const value = row[colIndex];
              const strValue = String(value);

              if (matchesPattern(strValue, patterns)) {
                return false;
              }
            }
          }
        }

        return true;
      }),
    }));
  }

  return result;
}

export function parseFilter(filter: string): FieldFilterMap | undefined {
  if (!filter || !filter.trim()) {
    return undefined;
  }

  const filterMap: FieldFilterMap = { include: {}, exclude: {} };
  const fieldConditions = filter
    .split(FILTER_DELIMITER)
    .map((cond) => cond.trim())
    .filter(Boolean);

  const checkDateConditions = (condition: string): string[] => {
    const checkedConditions: string[] = [];
    const conditions = condition
      .split(VALUE_DELIMITER)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const c of conditions) {
      if (c.startsWith(DATE_FILTER_PREFIX)) {
        const days = parseDaysFromDateFilter(c);
        checkedConditions.push(calculateTargetDate(days));
      } else {
        checkedConditions.push(c);
      }
    }
    return checkedConditions;
  };

  for (const rawCondition of fieldConditions) {
    const isExclusion = rawCondition.startsWith(EXCLUSION_PREFIX);
    const condition = isExclusion ? rawCondition.slice(1).trim() : rawCondition;

    const tablePrefix = condition.indexOf(TABLE_PREFIX);
    let header = '';
    let values = condition;

    if (tablePrefix !== -1) {
      header = condition.slice(0, tablePrefix).trim();
      values = condition.slice(tablePrefix + 1);
    }

    const checkedConditions = checkDateConditions(values);

    const targetMap = isExclusion ? filterMap.exclude : filterMap.include;
    if (!targetMap[header]) {
      targetMap[header] = [];
    }
    targetMap[header].push(...checkedConditions);
  }

  return filterMap;
}

const parseDaysFromDateFilter = (filterValue: string): number => {
  const daysString = filterValue.replace(DATE_FILTER_PREFIX, '');
  return parseInt(daysString, 10) || 0;
};

const calculateTargetDate = (days: number): string => {
  const currentDate = new Date();
  const targetDate = new Date(currentDate);
  targetDate.setDate(currentDate.getDate() + days);
  return targetDate.toISOString().split('T')[ISO_DATE_PART_INDEX];
};

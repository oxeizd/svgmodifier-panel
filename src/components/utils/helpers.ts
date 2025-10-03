/**
 * Форматирует число с заданным количеством десятичных знаков.
 */
export const roundToFixed = (value: number, decimals = 3): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * Сравнивает два числа с помощью оператора
 */
export function compareValues(a: number, b: number, operator: string): boolean {
  switch (operator) {
    case '<':
      return a < b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '=':
      return a === b;
    case '!=':
      return a !== b;
    default:
      return false;
  }
}

/**
 * Проверяет, содержит ли строка специальные символы для регулярных выражений.
 */
export function RegexCheck(value: string): boolean {
  const regexSpecialChars = /[.*+?^${}()|[\]\\]/;

  if (regexSpecialChars.test(value)) {
    return true;
  }
  return false;
}

/**
 *
 */
export function matchPattern(pattern: string, target: string): boolean {
  if (pattern === target) {
    return true;
  }

  if (RegexCheck(pattern)) {
    try {
      return new RegExp(pattern).test(target);
    } catch {
      return false;
    }
  }

  return false;
}

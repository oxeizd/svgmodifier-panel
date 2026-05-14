import { useMemo } from 'react';
import { PanelOptions } from 'types';

function wildcardMatch(pattern: string, text: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp('^' + escaped + '$', 'i');
  return regex.test(text);
}

const normalizeDsName = (name: string): string => {
  if (!name) {
    return '';
  }

  let s = name.trim();
  const prefixMatch = s.match(/^(C[A-Z]?\d+)/i);
  if (prefixMatch) {
    s = s.slice(prefixMatch[0].length).trim();
  }

  return s.replace(/\s+/g, ' ');
};

export const useNotificationData = (dsMap: Map<string, Set<string>>, options: PanelOptions['notifyTooltip']) => {
  const { enable, excludeFilter } = options;

  const filteredNames = useMemo(() => {
    if (!enable || !dsMap.size) {
      return [];
    }

    const patterns = excludeFilter
      ? excludeFilter
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

    const result: string[] = [];

    for (const [originalDsName, refIds] of dsMap) {
      const dsName = normalizeDsName(originalDsName);

      if (patterns.length === 0) {
        result.push(dsName);
        continue;
      }

      const allExcluded = Array.from(refIds).every((refId) =>
        patterns.some((pattern) => wildcardMatch(pattern, refId))
      );

      if (!allExcluded) {
        result.push(dsName);
      }
    }

    return result;
  }, [dsMap, enable, excludeFilter]);

  const count = filteredNames.length;

  return {
    show: enable && count > 0,
    count,
    dataSourceNames: filteredNames,
  };
};

import { QueriesArray } from '../../domain/services/dataHandler';

export function queriesFilter(
  queries: QueriesArray,
  selector: number[] | undefined,
  index: number,
  elemsLength: number,
  autoConfig?: boolean
) {
  const fieldsLength = queries.fields?.length || 0;
  const tablesLenght = queries.tables?.length || 0;
  const metricsLength = fieldsLength + tablesLenght;

  if (metricsLength === 0) {
    return;
  }

  if (selector && selector.length > 0) {
    const selectorSet = new Set(selector);

    if (queries.fields) {
      queries.fields = queries.fields.filter((item) => selectorSet.has(item.counter));
    }

    if (queries.tables) {
      queries.tables = queries.tables.filter((item) => selectorSet.has(item.counter));
    }

    return;
  }

  if (autoConfig === true) {
    const keepCounters = new Set<number>();

    if (metricsLength === elemsLength) {
      keepCounters.add(index + 1);
    } else if (metricsLength < elemsLength) {
      if (index < metricsLength) {
        keepCounters.add(index + 1);
      }
    } else {
      const lastIndex = elemsLength - 1;
      if (index < lastIndex) {
        keepCounters.add(index + 1);
      } else {
        for (let c = elemsLength - 1; c < metricsLength; c++) {
          keepCounters.add(c + 1);
        }
      }
    }

    if (queries.fields) {
      queries.fields = queries.fields.filter((_, idx) => keepCounters.has(idx + 1));
    }
    if (queries.tables) {
      queries.tables = queries.tables.filter((_, idx) => keepCounters.has(idx + 1));
    }

    return;
  }
}

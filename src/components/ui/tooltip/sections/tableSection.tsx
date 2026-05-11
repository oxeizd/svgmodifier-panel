import React from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { TooltipContent } from 'components/types';
import { getTableContainerStyles, getTableCellStyles, getTableHeaderRowStyles } from '../styles';

interface TableSectionProps {
  tables: NonNullable<TooltipContent['queryTableData']>;
}

// Внутренняя функция для рендеринга отдельной таблицы
const renderSingleTable = (tableData: NonNullable<TooltipContent['queryTableData']>[number], theme: GrafanaTheme2) => {
  if (!tableData?.headers || !tableData?.columnsData) {
    return null;
  }

  // Нормализуем headers: приводим к формату массива массивов
  const normalizedHeaders = Array.isArray(tableData.headers)
    ? Array.isArray(tableData.headers[0])
      ? tableData.headers // уже массив массивов
      : [tableData.headers] // простой массив -> оборачиваем в массив
    : [];

  return (
    <div style={getTableContainerStyles()}>
      <table
        style={{
          width: 'auto',
          minWidth: '100%',
          borderCollapse: 'collapse',
          fontSize: '11px',
          tableLayout: 'auto',
        }}
      >
        {normalizedHeaders.map((headerRow, headerIndex) => (
          <thead key={`header-row-${headerIndex}`}>
            <tr style={getTableHeaderRowStyles(theme)}>
              {headerRow.map((header, index) => (
                <th
                  key={`header-${index}`}
                  style={{
                    ...getTableCellStyles(theme, true),
                    whiteSpace: 'nowrap',
                  }}
                >
                  {String(header)}
                </th>
              ))}
            </tr>
          </thead>
        ))}
        <tbody>
          {[...tableData.columnsData].reverse().map((column, columnIndex) => (
            <tr key={`column-${columnIndex}`}>
              {column.row.map((cell, cellIndex) => (
                <td
                  key={`cell-${cellIndex}`}
                  style={{
                    ...getTableCellStyles(theme, false),
                    whiteSpace: 'nowrap',
                    color: column.color || 'inherit',
                  }}
                >
                  {String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const TableSection: React.FC<TableSectionProps> = ({ tables }) => {
  const theme = useTheme2();

  if (!tables || tables.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '12px' }}>
      {tables.map((table, tableIndex) => (
        <div key={`table-${tableIndex}`} style={{ marginBottom: tableIndex < tables.length - 1 ? '12px' : 0 }}>
          {table.title && (
            <div
              style={{
                fontWeight: 'bold',
                marginBottom: '6px',
                fontSize: '12px',
                color: theme.colors.text.primary,
              }}
            >
              {table.title}
            </div>
          )}
          {renderSingleTable(table, theme)}
        </div>
      ))}
    </div>
  );
};

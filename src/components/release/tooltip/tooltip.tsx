import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTheme2 } from '@grafana/ui';
import { GrafanaTheme2, TimeRange } from '@grafana/data';
import { useTooltipLogic } from './hooks';
import { PanelOptions, TooltipContent, TableVizData, SingleTableData } from 'types';
import { formatTimeRange, getUniqueLinesByKey } from './utils';
import {
  getTooltipContainerStyles,
  getTimeStyles,
  getDividerStyles,
  getMetricItemStyles,
  getTitleStyles,
  getMetricContainerStyles,
  getLabelStyles,
  getValueStyles,
  getTextLineStyles,
  getTextBlockStyles,
  getTableContainerStyles,
  getTableCellStyles,
  getTableHeaderRowStyles,
} from './styles';

// Function to render the table
const renderTable = (tableData: SingleTableData, theme: GrafanaTheme2) => {
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
        {tableData.headers.map((headerRow, headerIndex) => (
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
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        ))}
        <tbody>
          {/* Изменяем порядок: начинаем с последней записи */}
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
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface TooltipProps {
  containerRef: React.RefObject<HTMLDivElement>;
  tooltipData: TooltipContent[];
  tableData: TableVizData[];
  options: PanelOptions['tooltip'];
  timeRange: TimeRange;
}

export const TooltipV2: React.FC<TooltipProps> = (TooltipProps) => {
  const { containerRef, tooltipData, tableData, options, timeRange } = TooltipProps;
  const tooltipRef = useRef<HTMLDivElement>(null);
  const theme = useTheme2();

  const { tooltipState, adjustedCoords } = useTooltipLogic(containerRef, tooltipData, tableData, {
    hideZeros: options.hideZeros,
    sort: options.sort,
  });

  const hasContent = tooltipState.content.length > 0;
  const currentId = tooltipState.content[0]?.id || tooltipState.id || '';
  const currentTableData = currentId ? tableData.find((table) => table.id === currentId) : undefined;

  const hasTables = currentTableData && currentTableData.tables.length > 0;

  // Ранний возврат если нет ни контента ни таблиц
  if (!tooltipState.visible || (!hasContent && !hasTables)) {
    return null;
  }

  // Получаем уникальный текст ТОЛЬКО если есть контент
  const uniqueTextAbove = hasContent ? getUniqueLinesByKey(tooltipState.content, 'textAbove') : [];
  const uniqueTextBelow = hasContent ? getUniqueLinesByKey(tooltipState.content, 'textBelow') : [];

  // Получаем текст из tableData если нет контента
  const tableTextAbove = !hasContent && currentTableData?.textAbove ? [currentTableData.textAbove] : [];
  const tableTextBelow = !hasContent && currentTableData?.textBelow ? [currentTableData.textBelow] : [];

  const hasTextAbove = uniqueTextAbove.length > 0 || tableTextAbove.length > 0;
  const hasTextBelow = uniqueTextBelow.length > 0 || tableTextBelow.length > 0;

  const containerStyles = getTooltipContainerStyles(theme, options, adjustedCoords, hasTables);

  return ReactDOM.createPortal(
    <div ref={tooltipRef} data-tooltip="true" style={containerStyles}>
      {/* Time - показываем всегда если есть тултип */}
      <div style={getTimeStyles(theme)}>{formatTimeRange(timeRange)}</div>

      {/* Divider - показываем всегда если есть тултип */}
      <div style={getDividerStyles(theme)} />

      {/* Text Above - объединяем все источники */}
      {hasTextAbove && (
        <div style={getTextBlockStyles()}>
          {uniqueTextAbove.length > 0
            ? uniqueTextAbove.map((line, index) => (
                <div key={`text-above-${index}`} style={getTextLineStyles(theme)}>
                  {line}
                </div>
              ))
            : tableTextAbove.map((line, index) => (
                <div key={`table-text-above-${index}`} style={getTextLineStyles(theme)}>
                  {line}
                </div>
              ))}
        </div>
      )}

      {/* METRICS - показываем только если есть контент */}
      {hasContent &&
        tooltipState.content.map((item, index) => (
          <div key={`metric-${item.id}-${index}`} style={getMetricItemStyles()}>
            {item.title && <div style={getTitleStyles(theme)}>{item.title}</div>}
            <div style={getMetricContainerStyles(options)}>
              <span style={getLabelStyles(theme, options)}>
                {item.label}
                {options.valuePosition === 'standard' && ': '}
              </span>
              <span style={getValueStyles(theme, options, item.color)}>{item.metric || ''}</span>
            </div>
          </div>
        ))}

      {/* Render the Table if available */}
      {hasTables && (
        <div style={{ marginTop: hasContent || hasTextAbove ? '12px' : '0px' }}>
          {currentTableData!.tables.map((table, index) => (
            <div key={`table-${index}`}>
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
              {renderTable(table, theme)}
            </div>
          ))}
        </div>
      )}

      {/* Text Below - объединяем все источники */}
      {hasTextBelow && (
        <div style={{ marginTop: hasContent || hasTables || hasTextAbove ? '12px' : '0px' }}>
          {uniqueTextBelow.length > 0
            ? uniqueTextBelow.map((line, index) => (
                <div key={`text-below-${index}`} style={getTextLineStyles(theme)}>
                  {line}
                </div>
              ))
            : tableTextBelow.map((line, index) => (
                <div key={`table-text-below-${index}`} style={getTextLineStyles(theme)}>
                  {line}
                </div>
              ))}
        </div>
      )}
    </div>,
    document.body
  );
};

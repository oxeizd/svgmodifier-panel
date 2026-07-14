import React from 'react';
import { useTheme2 } from '@grafana/ui';
import { GridContent } from 'components/domain/models';

interface MetricsGridProps {
  data: GridContent[];
  columns?: number | 'auto';
  showOnlyFiring?: boolean;
  equalHeight?: boolean;
  layout?: 'grid' | 'columns';
}

const scrollbarStyles = (theme: any) => `
  .metrics-container {
    scrollbar-width: thin;
    scrollbar-color: ${theme.colors.border.weak} transparent;
  }
  .metrics-container::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .metrics-container::-webkit-scrollbar-track {
    background: transparent;
  }
  .metrics-container::-webkit-scrollbar-thumb {
    background: ${theme.colors.border.weak};
    border-radius: 3px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .metrics-container:hover::-webkit-scrollbar-thumb {
    opacity: 1;
  }
  .metrics-container::-webkit-scrollbar-thumb:hover {
    background: ${theme.colors.text.secondary};
  }
`;

export const MetricsGrid: React.FC<MetricsGridProps> = ({
  data,
  columns = 4,
  showOnlyFiring = false,
  equalHeight = true,
  layout = 'columns',
}) => {
  const theme = useTheme2();

  if (!data.length) {
    return (
      <div style={{ padding: '16px', color: theme.colors.text.secondary }}>
        {showOnlyFiring ? 'No firing metrics' : 'No metrics data'}
      </div>
    );
  }

  const renderCard = (item: GridContent) => {
    const cardHasFiring =
      item.fields?.some((field) => field.lvl > 0) || item.tables?.some((table) => (table.lvl ?? 0) > 0);

    const primaryColor = item.color || 'transparent';

    const visibleFields = showOnlyFiring ? item.fields?.filter((field) => field.lvl > 0) || [] : item.fields || [];

    const visibleTables = showOnlyFiring
      ? item.tables?.filter((table) => (table.lvl ?? 0) > 0) || []
      : item.tables || [];

    return (
      <div
        key={item.id}
        style={{
          border: `2px solid ${cardHasFiring ? primaryColor : theme.colors.border.weak}`,
          borderRadius: '8px',
          padding: '12px',
          backgroundColor: cardHasFiring ? `${primaryColor}20` : theme.colors.background.primary,
          boxShadow: theme.shadows.z1,
          transition: 'border-color 0.2s',
          display: 'flex',
          flexDirection: 'column',
          breakInside: layout === 'columns' ? 'avoid' : undefined,
          marginBottom: layout === 'columns' ? '12px' : undefined,
          alignSelf: equalHeight ? 'stretch' : 'start',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '14px',
            color: theme.colors.text.primary,
            marginBottom: '8px',
          }}
        >
          {item.title || item.id}
        </div>

        {visibleFields.map((field, idx) => {
          const color = field.color || 'transparent';
          const isFiring = field.lvl > 0;
          const displayValue = field.displayValue ?? field.metricValue.toString();

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '4px 0',
                borderBottom: idx < visibleFields.length - 1 ? `1px solid ${theme.colors.border.weak}` : 'none',
                gap: '8px',
              }}
            >
              {/* ✅ Label: перенос на 2 строки с многоточием */}
              <div
                style={{
                  fontSize: '13px',
                  color: theme.colors.text.secondary,
                  flex: 1,
                  minWidth: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: '1.4',
                  maxHeight: '2.8em',
                  wordBreak: 'break-word',
                }}
                title={field.label}
              >
                {field.label}
              </div>
              
              {/* ✅ Value: всегда видно, не сжимается */}
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isFiring ? color : theme.colors.text.primary,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  marginLeft: 'auto',
                }}
              >
                {displayValue}
                {isFiring && <span style={{ marginLeft: '6px', fontSize: '12px' }}>⚠️</span>}
              </div>
            </div>
          );
        })}

        {visibleTables.map((table, idx) => (
          <div key={idx} style={{ marginTop: '8px', fontSize: '12px', color: theme.colors.text.secondary }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{table.label || 'Table'}</div>
            <div>Rows: {table.columnsData?.length ?? 0}</div>
          </div>
        ))}

        {visibleFields.length === 0 && visibleTables.length === 0 && (
          <div style={{ fontSize: '12px', color: theme.colors.text.secondary, fontStyle: 'italic' }}>
            No firing metrics
          </div>
        )}
      </div>
    );
  };

  if (layout === 'columns') {
    const columnCount = typeof columns === 'number' ? Math.min(columns, 12) : undefined;
    const columnWidth = columns === 'auto' ? '200px' : undefined;

    return (
      <>
        <style>{scrollbarStyles(theme)}</style>
        <div
          className="metrics-container"
          style={{
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <div
            style={{
              columnCount,
              columnWidth,
              columnGap: '12px',
              padding: '8px',
              width: '100%',
              boxSizing: 'border-box',
              overflow: 'visible',
            }}
          >
            {data.map((item) => renderCard(item))}
          </div>
        </div>
      </>
    );
  }

  const getGridTemplateColumns = () => {
    if (columns === 'auto') {
      return 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))';
    }
    const colCount = Math.min(columns as number, 12);
    return `repeat(${colCount}, 1fr)`;
  };

  return (
    <>
      <style>{scrollbarStyles(theme)}</style>
      <div
        className="metrics-container"
        style={{
          display: 'grid',
          gridTemplateColumns: getGridTemplateColumns(),
          gap: '12px',
          padding: '8px',
          overflowY: 'auto',
          overflowX: 'hidden',
          height: '100%',
          width: '100%',
          boxSizing: 'border-box',
          alignItems: equalHeight ? 'stretch' : 'start',
        }}
      >
        {data.map((item) => renderCard(item))}
      </div>
    </>
  );
};
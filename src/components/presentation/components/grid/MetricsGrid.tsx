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
    padding-right: 4px;
    container-type: inline-size; /* включаем container queries по ширине */
    container-name: metrics;
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

  /* Адаптивность на основе РАЗМЕРА ПАНЕЛИ (а не окна браузера) */
  @container metrics (max-width: 600px) {
    .card-title {
      font-size: 13px;
      max-height: 2.6em;
      overflow: hidden;
      word-break: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .metrics-grid-card {
      padding: 6px;
      margin-bottom: 6px;
    }
  }

  /* Совсем маленькая панель: label сверху, value снизу */
  @container metrics (max-width: 110px) {
    .metric-field {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 2px;
      margin-bottom: 6px;
    }

    .metric-label {
      font-size: 11px;
      max-height: 2.4em;
      width: 100%;
    }

    .metric-value {
      margin-left: 0 !important;
      font-size: 11px;
      width: 100%;
      text-align: left;
    }

    .card-title {
      font-size: 12px;
    }
  }

  /* Fallback для браузеров без поддержки container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 600px) {
      .metric-field {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }
      .metric-value {
        margin-left: 0;
      }
    }
  }
`;

export const MetricsGrid: React.FC<MetricsGridProps> = ({
  data,
  columns,
  showOnlyFiring = false,
  equalHeight = true,
  layout = 'columns',
}) => {
  const theme = useTheme2();

  if (!data.length) {
    return (
      <div style={{ padding: '12px', color: theme.colors.text.secondary }}>
        {showOnlyFiring ? 'No firing metrics' : 'No metrics data'}
      </div>
    );
  }

  const cardBaseStyle = {
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: '6px',
    padding: '8px',
    backgroundColor: theme.colors.background.primary,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    transition: 'border-color 0.2s',
    display: 'flex',
    flexDirection: 'column',
    breakInside: layout === 'columns' ? 'avoid' : undefined,
    marginBottom: layout === 'columns' ? '8px' : undefined,
    alignSelf: equalHeight ? 'stretch' : 'start',
  } as const;

  const renderCard = (item: GridContent) => {
    const cardHasFiring =
      item.fields?.some((field) => field.lvl > 0) || item.tables?.some((table) => (table.lvl ?? 0) > 0);

    const primaryColor = item.color || 'transparent';

    const visibleFields = showOnlyFiring ? item.fields?.filter((field) => field.lvl > 0) || [] : item.fields || [];

    const visibleTables = showOnlyFiring
      ? item.tables?.filter((table) => (table.lvl ?? 0) > 0) || []
      : item.tables || [];

    const cardStyle = {
      ...cardBaseStyle,
      borderColor: cardHasFiring ? primaryColor : theme.colors.border.weak,
      backgroundColor: cardHasFiring ? `${primaryColor}20` : theme.colors.background.primary,
    };

    return (
      <div key={item.id} style={cardStyle} className="metrics-grid-card">
        <div
          className="card-title"
          style={{
            fontWeight: 'bold',
            fontSize: '14px',
            color: theme.colors.text.primary,
            marginBottom: '6px',
            lineHeight: 1.2,
            overflow: 'hidden',
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            maxHeight: '2.4em',
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
              className="metric-field"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: idx < visibleFields.length - 1 ? '4px' : '0',
                gap: '8px',
                padding: '2px 0',
              }}
            >
              <div
                className="metric-label"
                style={{
                  fontSize: '12px',
                  color: theme.colors.text.primary,
                  flex: 1,
                  minWidth: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                  maxHeight: '2.6em',
                  wordBreak: 'break-word',
                }}
                title={field.label}
              >
                {field.label}
              </div>

              <div
                className="metric-value"
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: isFiring ? color : theme.colors.text.primary,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  marginLeft: 'auto',
                }}
              >
                {displayValue}
              </div>
            </div>
          );
        })}

        {visibleTables.map((table, idx) => (
          <div key={idx} style={{ marginTop: '6px', fontSize: '12px', color: theme.colors.text.secondary }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{table.label || 'Table'}</div>
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
              columnGap: '8px',
              padding: '4px',
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
      return 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))';
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
          gap: '8px',
          padding: '4px',
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

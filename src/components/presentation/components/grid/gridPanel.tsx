import React, { useRef } from 'react';
import { MetricsGrid } from './MetricsGrid';
import { usePanelContext } from 'components/application/context/panelContext';
import { useGridPanel } from './hooks/useGridPanel';
import { NotificationTooltip } from 'components/presentation/tooltips/notifyTooltip/tooltip';
import { useNotificationData } from 'components/presentation/tooltips/notifyTooltip/useNotificationData';

interface GridPanelProps {
  height: number;
  width: number;
}

export const GridPanel: React.FC<GridPanelProps> = ({ height, width }) => {
  const { options, processedData } = usePanelContext();

  const gridOptions = options.grid || {};
  const {
    columnMode = 'auto',
    columns = 'auto',
    layout = 'columns',
    showOnlyFiring = false,
    stretch = true,
    sortByFiring = false,
    emptyPlaceholder,
  } = gridOptions;

  const gridContent = useGridPanel(processedData, showOnlyFiring, sortByFiring);
  const containerRef = useRef<HTMLDivElement>(null);

  const notificationData = useNotificationData(processedData?.dataSourceMap || new Map(), options.notifyTooltip);

  return (
    <div ref={containerRef} style={{ height, width, overflow: 'hidden', position: 'relative' }}>
      <MetricsGrid
        data={gridContent}
        columns={columnMode === 'auto' ? 'auto' : columns}
        layout={layout}
        showOnlyFiring={showOnlyFiring}
        stretch={stretch}
        emptyPlaceholder={emptyPlaceholder}
      />

      {notificationData.show && (
        <NotificationTooltip
          count={notificationData.count}
          dataSourceNames={notificationData.dataSourceNames}
          show={notificationData.show}
          options={options.notifyTooltip}
          containerRef={containerRef}
        />
      )}
    </div>
  );
};

import React from 'react';
import { MetricsGrid } from './MetricsGrid';
import { usePanelContext } from 'components/application/context/panelContext';
import { useGridPanel } from './hooks/useGridPanel';

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

  return (
    <div style={{ height, width, overflow: 'hidden' }}>
      <MetricsGrid
        data={gridContent}
        columns={columnMode === 'auto' ? 'auto' : columns}
        layout={layout}
        showOnlyFiring={showOnlyFiring}
        stretch={stretch}
        emptyPlaceholder={emptyPlaceholder}
      />
    </div>
  );
};

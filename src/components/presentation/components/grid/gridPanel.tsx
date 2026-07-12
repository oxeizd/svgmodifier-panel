import React from 'react';
import { MetricsGrid } from './MetricsGrid';
import { usePanelContext } from 'components/application/context/panelContext';
import { useGridPanel } from 'components/application/hooks/useGridPanel';

interface GridPanelProps {
  height: number;
  width: number;
}

export const GridPanel: React.FC<GridPanelProps> = ({ height, width }) => {
  const { options, processedData } = usePanelContext();

  const gridOptions = options.grid || {};
  const {
    columns = 4,
    layout = 'columns',
    showOnlyFiring = false,
    equalHeight = true,
    sortByFiring = false,
  } = gridOptions;

  const gridContent = useGridPanel(processedData, showOnlyFiring, sortByFiring);

  return (
    <div style={{ height, width, overflow: 'hidden' }}>
      <MetricsGrid
        data={gridContent}
        columns={columns}
        layout={layout}
        showOnlyFiring={showOnlyFiring}
        equalHeight={equalHeight}
      />
    </div>
  );
};

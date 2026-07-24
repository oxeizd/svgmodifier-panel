import React, { useRef } from 'react';
import { Tooltip } from 'components/presentation/tooltips/svgTooltip/tooltip';
import { NotificationTooltip } from 'components/presentation/tooltips/notifyTooltip/tooltip';
import { useNotificationData } from 'components/presentation/tooltips/notifyTooltip/useNotificationData';
import { usePanelContext } from 'components/application/context/panelContext';
import { useSvgPanel } from './hooks/useSvgPanel';

interface SvgModePanelProps {
  height: number;
  width: number;
}

export const SvgModePanel: React.FC<SvgModePanelProps> = ({ height, width }) => {
  const { processedData, svgDoc, options, timeRange } = usePanelContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgString = useSvgPanel(processedData, svgDoc);
  const notificationData = useNotificationData(processedData?.dataSourceMap || new Map(), options.notifyTooltip);

  return (
    <div ref={containerRef} style={{ position: 'relative', height, width, overflow: 'hidden' }}>
      <div dangerouslySetInnerHTML={{ __html: svgString }} style={{ display: 'block', height, width }} />

      <Tooltip
        containerRef={containerRef}
        tooltipContent={processedData?.tooltipContent || []}
        options={options.tooltip}
        timeRange={timeRange}
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

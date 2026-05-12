import React, { useRef } from 'react';
import { PanelOptions } from 'types';
import { PanelProps } from '@grafana/data';
import { Tooltip } from './ui/tooltip/tooltip';
import { useSvgPanel } from './core/application/useSvgPanel';
import { NotificationTooltip } from './ui/notifyTooltip/tooltip';
import { useNotificationData } from './ui/notifyTooltip/hooks/useNotificationData';

interface Props extends PanelProps<PanelOptions> {}

const SvgPanel: React.FC<Props> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, timeRange, options, height, width } = props;

  const { svgString, tooltipContent, dataSourceMap } = useSvgPanel(data, timeRange, options);
  const notificationData = useNotificationData(dataSourceMap, options.notifyTooltip);

  return (
    <div ref={containerRef} style={{ position: 'relative', height, width, overflow: 'hidden' }}>
      <div dangerouslySetInnerHTML={{ __html: svgString }} style={{ display: 'block', height, width }} />

      <Tooltip
        containerRef={containerRef}
        tooltipContent={tooltipContent}
        options={options.tooltip}
        timeRange={timeRange}
      />

      {notificationData.show && (
        <NotificationTooltip
          count={notificationData.count}
          dataSourceNames={notificationData.dataSourceNames}
          show={notificationData.show}
          options={options.notifyTooltip}
        />
      )}
    </div>
  );
};

export default SvgPanel;

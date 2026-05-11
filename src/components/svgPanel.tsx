import React, { useRef } from 'react';
import { PanelOptions } from 'types';
import { PanelProps } from '@grafana/data';
import { Tooltip } from './ui/tooltip/tooltip';
import { NotificationTooltip } from './ui/notifyTooltip/tooltip';
import { useSvgPanel } from './core/application/useSvgPanel';

interface Props extends PanelProps<PanelOptions> {}

const SvgPanel: React.FC<Props> = (props) => {
  const { data, timeRange, options, height, width } = props;
  const { notifyTooltip, tooltip } = options;

  const containerRef = useRef<HTMLDivElement>(null);

  const { svgString, tooltipContent, dataSourceNames } = useSvgPanel(data, timeRange, options);

  const showNotify = notifyTooltip.enable && dataSourceNames.length > 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', height, width, overflow: 'hidden' }}>
      <div dangerouslySetInnerHTML={{ __html: svgString }} style={{ display: 'block', height, width }} />

      <Tooltip containerRef={containerRef} tooltipContent={tooltipContent} options={tooltip} timeRange={timeRange} />

      {showNotify && (
        <NotificationTooltip
          count={dataSourceNames.length}
          dataSourceNames={dataSourceNames}
          show={showNotify}
          options={notifyTooltip}
        />
      )}
    </div>
  );
};

export default SvgPanel;

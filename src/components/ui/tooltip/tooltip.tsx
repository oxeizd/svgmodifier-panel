import ReactDOM from 'react-dom';
import React, { useRef } from 'react';
import { useTheme2 } from '@grafana/ui';
import { TimeRange } from '@grafana/data';
import { PanelOptions } from 'types';
import { TooltipContent } from 'components/types';
import { useTooltipLogic } from './hooks';
import { getTooltipContainerStyles } from './styles';
import { TimeSection } from './sections/timeSection';
import { TextSection } from './sections/textSection';
import { MetricsSection } from './sections/metricsSection';
import { TableSection } from './sections/tableSection';

interface Props {
  containerRef: React.RefObject<HTMLDivElement>;
  tooltipContent: TooltipContent[];
  options: PanelOptions['tooltip'];
  timeRange: TimeRange;
}

export const Tooltip: React.FC<Props> = ({ containerRef, tooltipContent, options, timeRange }) => {
  const theme = useTheme2();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { tooltipState, adjustedCoords } = useTooltipLogic(tooltipContent, containerRef, options);

  if (!tooltipState.visible || !tooltipState.content) {
    return null;
  }

  const validCheck = <T,>(arr: T | T[] | undefined | null): T[] | undefined =>
    Array.isArray(arr) && arr.length > 0 ? arr : undefined;

  const metrics = validCheck(tooltipState.content?.queryData);
  const tableMetrics = validCheck(tooltipState.content?.queryTableData);
  const textAbove = validCheck(tooltipState.content?.textAbove);
  const textBelow = validCheck(tooltipState.content?.textBelow);

  if (!Boolean(metrics || tableMetrics || textAbove || textBelow)) {
    return null;
  }

  const containerStyles = getTooltipContainerStyles(theme, options, adjustedCoords, tableMetrics ? true : false);

  return ReactDOM.createPortal(
    <div ref={tooltipRef} data-tooltip="true" style={containerStyles}>
      {/* time */}
      <TimeSection timeRange={timeRange} />

      {/* text above */}
      {textAbove && <TextSection currentText={textAbove as string[]} />}

      {/* metrics */}
      {metrics && <MetricsSection queryData={metrics} options={options} />}

      {/* tables */}
      {tableMetrics && <TableSection tables={tableMetrics} />}

      {/* text below */}
      {textBelow && <TextSection currentText={textBelow as string[]} />}
    </div>,
    document.body
  );
};

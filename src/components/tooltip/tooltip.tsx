import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTheme2 } from '@grafana/ui';
import { TimeRange } from '@grafana/data';
import { useTooltipLogic } from './hooks';
import { PanelOptions, TooltipContent } from 'types';
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
} from './styles';

interface TooltipProps {
  containerRef: React.RefObject<HTMLDivElement>;
  tooltipData: TooltipContent[];
  options: PanelOptions['tooltip'];
  timeRange: TimeRange;
}

export const Tooltip: React.FC<TooltipProps> = (TooltipProps) => {
  const { containerRef, tooltipData, options, timeRange } = TooltipProps;
  const tooltipRef = useRef<HTMLDivElement>(null);
  const theme = useTheme2();

  const { tooltipState, adjustedCoords } = useTooltipLogic(containerRef, tooltipData, {
    hideZeros: options.hideZeros,
    sort: options.sort,
  });

  // Ранний возврат
  if (!tooltipState.visible || tooltipState.content.length === 0) {
    return null;
  }

  const uniqueTextAbove = getUniqueLinesByKey(tooltipState.content, 'textAbove');
  const uniqueTextBelow = getUniqueLinesByKey(tooltipState.content, 'textBelow');

  return ReactDOM.createPortal(
    <div ref={tooltipRef} data-tooltip="true" style={getTooltipContainerStyles(theme, options, adjustedCoords)}>
      {/* Время */}
      <div style={getTimeStyles(theme)}>{formatTimeRange(timeRange)}</div>

      {/* Разделитель */}
      <div style={getDividerStyles(theme)} />

      {/* Текст сверху */}
      {uniqueTextAbove.length > 0 && (
        <div style={getTextBlockStyles()}>
          {uniqueTextAbove.map((line, index) => (
            <div key={`text-above-${index}`} style={getTextLineStyles(theme)}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Метрики */}
      {tooltipState.content.map((item, index) => (
        <div key={`metric-${item.id}-${index}`} style={getMetricItemStyles()}>
          {/* Заголовок */}
          {item.title && <div style={getTitleStyles(theme)}>{item.title}</div>}

          {/* Значение */}
          <div style={getMetricContainerStyles(options)}>
            <span style={getLabelStyles(theme, options)}>
              {item.label}
              {options.valuePosition === 'standard' && ': '}
            </span>
            <span style={getValueStyles(theme, options, item.color)}>{item.metric}</span>
          </div>
        </div>
      ))}

      {/* Текст снизу */}
      {uniqueTextBelow.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {uniqueTextBelow.map((line, index) => (
            <div key={`text-below-${index}`} style={getTextLineStyles(theme)}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
};

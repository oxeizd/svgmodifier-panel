import React, { useRef, useState, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTheme2 } from '@grafana/ui';
import { PanelOptions } from 'types';
import { usePortal, useHiddenCount, useScrollAnimation } from './hooks';
import { Timer } from './timer';
import { INITIAL_TOOLTIP_WIDTH, MAX_TOOLTIP_WIDTH, TOOLTIP_WIDTH_STEP } from './constants';
import { getContainerStyles, getTitleStyles, absoluteTimerStyle, getMoreTextStyle, getListStyles } from './styles';

// Глобальный стиль (добавляется один раз)
if (typeof document !== 'undefined') {
  const styleId = 'hide-scrollbar-global-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = '.hide-scrollbar::-webkit-scrollbar { display: none; }';
    document.head.appendChild(style);
  }
}

export interface NotificationTooltipProps {
  count?: number;
  dataSourceNames?: string[];
  show: boolean;
  options?: PanelOptions['notifyTooltip'];
}

export const NotificationTooltip = React.memo<NotificationTooltipProps>(
  ({ count = 0, dataSourceNames = [], show, options = {} }) => {
    const theme = useTheme2();
    const { offsetX = 18, offsetY = 152, hideInEditMode = true } = options;
    const isEditing = window.location.search.includes('editPanel=');

    // Все хуки вызываются в одном порядке при каждом рендере
    const portalRef = usePortal();
    const textRef = useRef<HTMLDivElement>(null);
    const [tooltipWidth, setTooltipWidth] = useState(INITIAL_TOOLTIP_WIDTH);
    const hiddenCount = useHiddenCount(textRef, [dataSourceNames, tooltipWidth]);
    const { isActive: isAnimationActive, remainingSeconds } = useScrollAnimation(textRef, dataSourceNames);
    const [hasOverflow, setHasOverflow] = useState(false);

    useLayoutEffect(() => {
      if (!show || (hideInEditMode && isEditing)) {
        return;
      }
      const el = textRef.current;
      if (!el) {
        return;
      }
      const checkOverflow = () => {
        const isClipped = el.scrollHeight > el.clientHeight;
        setHasOverflow(isClipped);
        if (isClipped && tooltipWidth < MAX_TOOLTIP_WIDTH) {
          setTooltipWidth((prev) => Math.min(prev + TOOLTIP_WIDTH_STEP, MAX_TOOLTIP_WIDTH));
        }
      };
      checkOverflow();
      const observer = new ResizeObserver(checkOverflow);
      observer.observe(el);
      return () => observer.disconnect();
    }, [show, hideInEditMode, isEditing, dataSourceNames, tooltipWidth]);

    // Условный возврат после всех хуков
    if (!show || (hideInEditMode && isEditing)) {
      return null;
    }

    const formattedList = dataSourceNames.map((name, idx) => (
      <span key={idx} style={{ display: 'inline-block', whiteSpace: 'normal', marginRight: '8px' }}>
        <strong style={{ color: theme.colors.text.primary, fontWeight: 'bold' }}>{idx + 1}.</strong> {name}
      </span>
    ));

    if (!portalRef.current) {
      return null;
    }

    const content = (
      <div style={{ position: 'fixed', top: offsetY, right: offsetX }}>
        <div style={getContainerStyles(theme, tooltipWidth)}>
          {dataSourceNames.length > 0 && (
            <>
              <div>
                <div style={getTitleStyles(theme)}>Затронуто: {count} ФП</div>
                {hasOverflow && hiddenCount > 0 && <div style={getMoreTextStyle(theme)}>Ещё {hiddenCount}</div>}
                {hasOverflow && !isAnimationActive && remainingSeconds > 0 && (
                  <div style={absoluteTimerStyle}>
                    <Timer remaining={remainingSeconds} theme={theme} />
                  </div>
                )}
              </div>
              <div ref={textRef} style={getListStyles(theme, hasOverflow)} className="hide-scrollbar">
                {formattedList}
              </div>
            </>
          )}
        </div>
      </div>
    );

    return ReactDOM.createPortal(content, portalRef.current);
  }
);

NotificationTooltip.displayName = 'NotificationTooltip';

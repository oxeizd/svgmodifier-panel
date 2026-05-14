import React, { useRef, useState, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTheme2 } from '@grafana/ui';
import { PanelOptions } from 'types';
import { usePortal, useAutoScroll } from './hooks';
import { INITIAL_TOOLTIP_WIDTH, MAX_TOOLTIP_WIDTH, TOOLTIP_WIDTH_STEP } from './constants';
import { getContainerStyles, getTitleStyles, getListStyles } from './styles';

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
    const { offsetX = 19, offsetY = 146, hideInEditMode = true } = options;
    const isEditing = window.location.search.includes('editPanel=');

    const portalRef = usePortal();
    const textRef = useRef<HTMLDivElement>(null);
    const [tooltipWidth, setTooltipWidth] = useState(INITIAL_TOOLTIP_WIDTH);
    const [needsScroll, setNeedsScroll] = useState(false);

    useAutoScroll(textRef, needsScroll, dataSourceNames);

    useLayoutEffect(() => {
      if (!show || (hideInEditMode && isEditing)) {
        setNeedsScroll(false);
        return;
      }
      const el = textRef.current;
      if (!el) {
        return;
      }

      const checkOverflow = () => {
        if (!textRef.current) {
          return;
        }
        const isClipped = textRef.current.scrollHeight - textRef.current.clientHeight > 2;
        const isMaxWidth = tooltipWidth >= MAX_TOOLTIP_WIDTH;

        if (isClipped && !isMaxWidth) {
          setTooltipWidth((prev) => Math.min(prev + TOOLTIP_WIDTH_STEP, MAX_TOOLTIP_WIDTH));
          setNeedsScroll(false);
        } else if (isMaxWidth && isClipped) {
          setNeedsScroll(true);
        } else {
          setNeedsScroll(false);
        }
      };

      checkOverflow();
      const observer = new ResizeObserver(checkOverflow);
      observer.observe(el);
      return () => observer.disconnect();
    }, [show, hideInEditMode, isEditing, dataSourceNames, tooltipWidth]);

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
              </div>
              <div ref={textRef} style={getListStyles(theme, needsScroll)} className="hide-scrollbar">
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

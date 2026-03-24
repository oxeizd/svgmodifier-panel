import React from 'react';
import ReactDOM from 'react-dom';
import { useTheme2 } from '@grafana/ui';

export interface NotificationTooltipProps {
  count?: number;
  dataSourceNames?: string[];
  show: boolean;
  anchorRef?: React.RefObject<HTMLElement | null>;
  offsetX?: number;
  offsetY?: number;
  fixedToWindow?: boolean;
}

export const NotificationTooltip: React.FC<NotificationTooltipProps> = ({
  count = 0,
  dataSourceNames = [],
  show,
  anchorRef,
  offsetX = 19, // увеличен отступ справа
  offsetY = 152,
  fixedToWindow = false,
}) => {
  const theme = useTheme2();
  const portalElRef = React.useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  // Создаём контейнер портала
  React.useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('data-testid', 'notify-tooltip-portal');
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '0';
    el.style.height = '0';
    el.style.zIndex = '99999';
    portalElRef.current = el;
    document.body.appendChild(el);
    return () => {
      if (portalElRef.current) {
        document.body.removeChild(portalElRef.current);
        portalElRef.current = null;
      }
    };
  }, []);

  const computePosition = React.useCallback(() => {
    if (!portalElRef.current) {
      return;
    }

    if (fixedToWindow || !anchorRef?.current) {
      setStyle({
        position: 'fixed',
        top: `${offsetY}px`,
        right: `${offsetX}px`,
      });
    } else {
      const rect = anchorRef.current.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: `${Math.max(8, rect.top + offsetY)}px`,
        left: `${rect.right + offsetX}px`,
      });
    }
  }, [anchorRef, offsetX, offsetY, fixedToWindow]);

  React.useEffect(() => {
    computePosition();
  }, [computePosition]);

  React.useEffect(() => {
    const handleUpdate = () => computePosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [computePosition]);

  if (!show || !portalElRef.current) {
    return null;
  }

  const containerStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.background.secondary,
    padding: '12px',
    borderRadius: '5px',
    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.3)',
    border: `1px solid ${theme.colors.border.weak}`,
    fontFamily: theme.typography.fontFamily,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    maxWidth: 'calc(100vw - 40px)',
    whiteSpace: 'nowrap',
  };

  const leftBlockStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center', // вертикальное центрирование внутри блока
  };

  const affectedLabelStyles: React.CSSProperties = {
    color: theme.colors.text.secondary,
    fontSize: '11px',
    lineHeight: '1.2',
    marginBottom: '2px',
  };

  const countStyles: React.CSSProperties = {
    color: theme.colors.primary.text,
    fontSize: '20px',
    fontWeight: 'bold',
    lineHeight: '1.2',
  };

  const unitStyles: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 'normal',
    marginLeft: '2px',
    color: theme.colors.text.secondary,
  };

  const separatorStyles: React.CSSProperties = {
    color: theme.colors.text.disabled,
    fontSize: '16px',
    margin: '0 4px',
  };

  const dataSourceListStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    overflowX: 'auto',
    maxWidth: '400px',
    whiteSpace: 'nowrap',
    scrollbarWidth: 'thin',
  };

  // Улучшенный стиль для каждого источника данных: убран чёрный фон, добавлена граница и тень
  const dataSourceItemStyles: React.CSSProperties = {
    backgroundColor: theme.colors.background.primary, // не чёрный, а основной цвет фона
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '12px',
    color: theme.colors.text.primary,
    whiteSpace: 'nowrap',
    border: `1px solid ${theme.colors.border.weak}`,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };

  const hasDataSources = dataSourceNames.length > 0;

  const content = (
    <div style={style}>
      <div style={containerStyles}>
        <div style={leftBlockStyles}>
          <div style={affectedLabelStyles}>затронуто</div>
          <div style={countStyles}>
            {count}
            <span style={unitStyles}>ФП</span>
          </div>
        </div>

        {hasDataSources && (
          <>
            <div style={separatorStyles}>|</div>
            <div style={dataSourceListStyles}>
              {dataSourceNames.map((name, index) => (
                <div key={index} style={dataSourceItemStyles} title={name}>
                  {name.length > 20 ? `${name.substring(0, 17)}...` : name}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, portalElRef.current);
};

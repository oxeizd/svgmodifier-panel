import { MAX_TOOLTIP_WIDTH, INITIAL_TOOLTIP_WIDTH } from './constants';

type Theme = any; // замените на конкретный тип из @grafana/ui

export const getContainerStyles = (theme: Theme, tooltipWidth: number): React.CSSProperties => ({
  position: 'relative',
  backgroundColor: theme.colors.background.primary,
  padding: '8px 10px',
  borderRadius: '3px',
  border: '1px solid rgba(255, 0, 0, 0.5)',
  boxShadow: 'inset 0 0 15px rgba(255, 0, 0, 0.4)',
  fontFamily: theme.typography.fontFamily,
  pointerEvents: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  width: tooltipWidth,
  maxWidth: MAX_TOOLTIP_WIDTH,
  minWidth: INITIAL_TOOLTIP_WIDTH,
  height: 66,
  boxSizing: 'border-box',
  overflow: 'hidden',
});

export const getTitleStyles = (theme: Theme): React.CSSProperties => ({
  color: theme.colors.text.secondary,
  fontSize: '12px',
  lineHeight: 1.2,
  flexShrink: 0,
});

export const absoluteTimerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '45%',
  right: '20px',
  transform: 'translateY(-50%)',
  zIndex: 1,
};

export const getMoreTextStyle = (theme: Theme): React.CSSProperties => ({
  position: 'absolute',
  top: 'calc(45% + 13px)',
  right: '19px',
  fontSize: '10px',
  color: theme.colors.text.secondary,
  zIndex: 1,
  whiteSpace: 'nowrap',
});

export const getListStyles = (theme: Theme, hasOverflow: boolean): React.CSSProperties => {
  const base: React.CSSProperties = {
    overflowY: 'auto',
    wordBreak: 'break-word',
    whiteSpace: 'normal',
    fontSize: '12px',
    lineHeight: 1.4,
    color: theme.colors.text.primary,
    flex: 1,
    minHeight: 0,
    paddingLeft: '4px',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    scrollBehavior: 'auto',
  };
  if (hasOverflow) {
    return { ...base, paddingRight: '20px' };
  }
  return {
    ...base,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  };
};

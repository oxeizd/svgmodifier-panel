import { CSSProperties } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { PanelOptions } from 'types';

export const getTooltipContainerStyles = (
  theme: GrafanaTheme2,
  options: PanelOptions['tooltip'],
  coords: { x: number; y: number }
): CSSProperties => ({
  position: 'fixed',
  left: coords.x,
  top: coords.y,
  backgroundColor: theme.colors.background.secondary,
  padding: '12px',
  borderRadius: '5px',
  pointerEvents: 'none',
  boxShadow: '0 3px 12px rgba(0, 0, 0, 0.3)',
  zIndex: 1000,
  maxWidth: `${options.maxWidth}px` || '500px',
  overflow: 'hidden',
  wordWrap: 'break-word',
  border: `1px solid ${theme.colors.border.weak}`,
  whiteSpace: 'normal',
  fontFamily: theme.typography.fontFamily,
});

/* Время */
export const getTimeStyles = (theme: GrafanaTheme2): CSSProperties => ({
  color: theme.colors.text.primary,
  fontSize: '12px',
  marginBottom: '8px',
});

/* Разделитель */
export const getDividerStyles = (theme: GrafanaTheme2): CSSProperties => ({
  borderBottom: `1px solid ${theme.colors.border.weak}`,
  margin: '0 -12px 8px -12px',
});

/* Метрики */
export const getMetricItemStyles = (): CSSProperties => ({
  marginBottom: '2px',
  lineHeight: '1.4',
});

/* Заголовок  метрики */
export const getTitleStyles = (theme: GrafanaTheme2): CSSProperties => ({
  color: theme.colors.text.secondary,
  marginBottom: '3px',
  fontSize: '12px',
});

/* Вид метрик */
export const getMetricContainerStyles = (options: PanelOptions['tooltip']): CSSProperties => ({
  display: options.valuePosition === 'right' ? 'flex' : 'block',
  justifyContent: options.valuePosition === 'right' ? 'space-between' : 'flex-start',
  alignItems: options.valuePosition === 'right' ? 'center' : 'flex-start',
});

/* значение лейбла метрики */
export const getLabelStyles = (theme: GrafanaTheme2, options: PanelOptions['tooltip']): CSSProperties => ({
  color: theme.colors.text.primary,
  marginRight: options.valuePosition === 'right' ? '8px' : '4px',
  fontSize: '13px',
});

/* значение метрики */
export const getValueStyles = (
  theme: GrafanaTheme2,
  options: PanelOptions['tooltip'],
  color?: string
): CSSProperties => ({
  color: color || theme.colors.text.primary,
  textAlign: options.valuePosition === 'right' ? 'right' : 'left',
  fontSize: '13px',
});

export const getTextLineStyles = (theme: GrafanaTheme2): CSSProperties => ({
  color: theme.colors.text.primary,
  fontSize: '13px',
  lineHeight: '1.4',
});

export const getTextBlockStyles = (): CSSProperties => ({
  marginBottom: '8px',
});

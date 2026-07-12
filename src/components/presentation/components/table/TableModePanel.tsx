import React from 'react';
import { PanelOptions } from 'types';

export const TableModePanel: React.FC<{ options: PanelOptions; height: number; width: number }> = ({
  height,
  width,
}) => {
  return <div style={{ height, width, overflow: 'auto' }}>{/* Рендер таблицы из processedData */}</div>;
};

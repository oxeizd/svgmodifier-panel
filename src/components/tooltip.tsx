import React, { useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { TooltipContent } from './types';

export const Tooltip: React.FC<{
  visible: boolean;
  x: number;
  y: number;
  content: TooltipContent[];
}> = ({ visible, x, y, content }) => {
  const [adjustedCoords, setAdjustedCoords] = useState({ x, y });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (visible && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();

      // Рассчитываем координаты с учётом границ экрана
      let newX = x;
      let newY = y;

      // Корректируем горизонтальную позицию
      if (newX + rect.width > window.innerWidth) {
        newX = window.innerWidth - rect.width - 10;
      }
      if (newX < 0) {
        newX = 10;
      }

      // Корректируем вертикальную позицию
      if (newY + rect.height > window.innerHeight) {
        newY = window.innerHeight - rect.height - 10;
      }
      if (newY < 0) {
        newY = 10;
      }

      setAdjustedCoords({ x: newX, y: newY });
    }
  }, [visible, x, y]);

  if (!visible) {
    return null;
  }

  const currentDateTime = new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: adjustedCoords.x,
    top: adjustedCoords.y,
    backgroundColor: '#0A0A0A',
    padding: '8px',
    borderRadius: '8px',
    pointerEvents: 'none',
    boxShadow: 'none',
    zIndex: 1000,
    maxWidth: '450px',
    overflow: 'hidden',
    wordWrap: 'break-word',
  };

  return ReactDOM.createPortal(
    <div ref={tooltipRef} style={tooltipStyle}>
      <div style={{ color: '#fff', marginBottom: '5px' }}>{currentDateTime}</div>
      {content.map((item, index) => (
        <div key={index} style={{ color: item.color }}>
          <span style={{ color: '#fff' }}>{item.label}: </span>
          <span>{item.metric}</span>
        </div>
      ))}
    </div>,
    document.body
  );
};

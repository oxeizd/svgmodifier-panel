import React from 'react';
import ReactDOM from 'react-dom';
import { TooltipContent } from './types';

export const Tooltip: React.FC<{ visible: boolean; x: number; y: number; content: TooltipContent[] }> = ({
  visible,
  x,
  y,
  content,
}) => {
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
    position: 'absolute',
    left: Math.min(x + 10, window.innerWidth - 210),
    top: y,
    backgroundColor: '#0A0A0A',
    padding: '8px',
    borderRadius: '8px',
    pointerEvents: 'none',
    boxShadow: 'none',
    zIndex: 1000,
    maxWidth: 400,
    overflow: 'hidden',
    wordWrap: 'break-word',
  };

  return ReactDOM.createPortal(
    <div style={tooltipStyle}>
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

import React from 'react';
import { CIRCULAR_RADIUS, CIRCULAR_CIRCUMFERENCE, COUNTDOWN_START } from './constants';

interface TimerProps {
  remaining: number;
  theme: any; // замените на конкретный тип из @grafana/ui
}

export const Timer = React.memo<TimerProps>(({ remaining, theme }) => {
  const total = COUNTDOWN_START;
  const strokeDashoffset = CIRCULAR_CIRCUMFERENCE * (1 - remaining / total);
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r={CIRCULAR_RADIUS} fill="none" stroke={theme.colors.border.weak} strokeWidth="2" />
      <circle
        cx="14"
        cy="14"
        r={CIRCULAR_RADIUS}
        fill="none"
        stroke={theme.colors.text.secondary}
        strokeWidth="2"
        strokeDasharray={CIRCULAR_CIRCUMFERENCE}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.3s linear' }}
      />
      <text x="14" y="19" textAnchor="middle" fontSize="10" fill={theme.colors.text.secondary}>
        {remaining}
      </text>
    </svg>
  );
});

Timer.displayName = 'Timer';

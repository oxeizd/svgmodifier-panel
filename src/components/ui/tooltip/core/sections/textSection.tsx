import React from 'react';
import { useTheme2 } from '@grafana/ui';
import { getTextLineStyles, getTextBlockStyles } from '../../styles';

interface TextSectionProps {
  currentText: string[];
}

export const TextSection: React.FC<TextSectionProps> = ({ currentText }) => {
  const theme = useTheme2();

  if (currentText.length === 0) {
    return null;
  }

  return (
    <div style={getTextBlockStyles()}>
      {currentText.map((line, index) => (
        <div key={`text-${index}`} style={getTextLineStyles(theme)}>
          {line}
        </div>
      ))}
    </div>
  );
};

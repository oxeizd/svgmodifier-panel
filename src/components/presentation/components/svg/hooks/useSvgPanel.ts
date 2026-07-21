import { useState, useEffect, useRef } from 'react';
import { updateSvg, svgToString } from 'components/infrastructure/svg/updater';
import { ProcessedData } from 'components/application/hooks/usePanelData';

export const useSvgPanel = (processedData: ProcessedData | null, svgDoc: any) => {
  const [svgString, setSvgString] = useState('');
  const isActiveRef = useRef(false);

  useEffect(() => {
    isActiveRef.current = true;

    if (!svgDoc) {
      setSvgString('');
      return;
    }

    const update = async () => {
      try {
        if (processedData?.operations) {
          await updateSvg(processedData.operations);
        }
        if (isActiveRef.current) {
          setSvgString(svgToString(svgDoc));
        }
      } catch (err) {
        console.error('Error updating SVG:', err);
      }
    };

    update();
    return () => {
      isActiveRef.current = false;
    };
  }, [processedData, svgDoc]);

  return svgString;
};

import { useEffect } from 'react';
import { TooltipContent } from 'components/types';
import { PanelOptions } from 'types';
import { processTooltipContent } from '../utils/formatting';

interface UseTooltipDataSyncParams {
  tooltipData: TooltipContent[];
  options: PanelOptions['tooltip'];
  pinnedTooltips: any[];
  setPinnedTooltips: React.Dispatch<React.SetStateAction<any[]>>;
}

export const useTooltipDataSync = ({
  tooltipData,
  options,
  pinnedTooltips,
  setPinnedTooltips,
}: UseTooltipDataSyncParams) => {
  useEffect(() => {
    setPinnedTooltips((prev) =>
      prev.map((pinned) => {
        const freshData = tooltipData.find((td) => td.id === pinned.elementId);
        if (freshData) {
          const newContent = processTooltipContent(freshData, options);
          if (newContent && JSON.stringify(newContent) !== JSON.stringify(pinned.content)) {
            return { ...pinned, content: newContent };
          }
        }
        return pinned;
      })
    );
  }, [tooltipData, options, setPinnedTooltips]);
};

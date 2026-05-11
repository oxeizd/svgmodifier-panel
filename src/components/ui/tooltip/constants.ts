import { TooltipContent } from 'components/types';

export interface TooltipState {
  id: string;
  content: TooltipContent | undefined;
  visible: boolean;
  x: number;
  y: number;
}

export const defaultTooltipState: TooltipState = {
  id: '',
  content: undefined,
  visible: false,
  x: 0,
  y: 0,
};

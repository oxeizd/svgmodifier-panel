import React, { createContext, useContext, useMemo } from 'react';
import { PanelData, TimeRange } from '@grafana/data';
import { PanelOptions } from 'types';
import { usePanelData, ProcessedData } from '../hooks/usePanelData';
import { DataMap } from 'components/domain/models/configModels';

interface PanelContextType {
  isLoading: boolean;
  svgDoc: Document | null;
  configMap: Map<string, DataMap> | null;
  mappingArray: any[] | null;
  processedData: ProcessedData | null;
  options: PanelOptions;
  timeRange: TimeRange;
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export const usePanelContext = () => {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error('usePanelContext must be used within PanelProvider');
  }
  return context;
};

interface PanelProviderProps {
  data: PanelData;
  timeRange: TimeRange;
  options: PanelOptions;
  children: React.ReactNode;
}

export const PanelProvider: React.FC<PanelProviderProps> = ({ data, timeRange, options, children }) => {
  const { processedData, isLoading, svgDoc, configMap, mappingArray } = usePanelData(data, timeRange, options);

  const value = useMemo(
    () => ({
      processedData,
      isLoading,
      svgDoc,
      configMap,
      mappingArray,
      options,
      timeRange,
    }),
    [processedData, isLoading, svgDoc, configMap, mappingArray, options, timeRange]
  );

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
};

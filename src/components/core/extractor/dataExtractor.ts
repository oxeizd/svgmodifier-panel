import { getDataSourceSrv } from '@grafana/runtime';
import { DataFrame, FieldType, getFieldDisplayName, PanelData, TimeRange } from '@grafana/data';

import { FieldsTimeSettings, getFieldTimeRange } from '../formatters/timeSettings';

export type DataFrameEntry = {
  type?: string;
  length?: number;
  dataSourceName?: string;
  values: Map<
    string,
    {
      values: string[];
      timestamps?: number[];
    }
  >;
};

export type DataFrameMap = Map<string, DataFrameEntry>;

export async function extractFields(panelData: PanelData, timeSettings: FieldsTimeSettings, timeRange: TimeRange) {
  const valueMap: DataFrameMap = new Map();
  const dataFrame = panelData.series;

  for (let i = 0; i < dataFrame.length; i++) {
    const frame: DataFrame = dataFrame[i];

    if (!frame.refId || !frame.fields?.length) {
      continue;
    }

    const { refId, fields, meta } = frame;
    const visualType = meta?.preferredVisualisationType;
    const CustomRangeTime = timeSettings?.fields?.get(refId) || timeSettings?.global;

    if (visualType === 'graph' || frame.fields.length === 2) {
      const timeField = fields.find((field) => field.type === FieldType.time);
      const valueField = fields.find((field) => field.type === FieldType.number);

      if (!valueField) {
        continue;
      }

      let values = valueField?.values.map(String);
      let timestamps = timeField?.values.map(Number) || [];
      const fieldDisplayName = getFieldDisplayName(valueField, frame, dataFrame);

      if (CustomRangeTime) {
        const result = getFieldTimeRange(timestamps, values, CustomRangeTime, timeRange);
        values = result.values;
        timestamps = result.timestamps;
      }

      addToMap(refId, valueMap, values, fieldDisplayName, timestamps, 'graph');
      continue;
    }

    for (const field of fields) {
      if (!field.values) {
        continue;
      }

      const values = field.values.map(String);
      const Length = values.length;
      const fieldDisplayName = getFieldDisplayName(field, frame, dataFrame);

      addToMap(refId, valueMap, values, fieldDisplayName, undefined, 'table', Length);
    }
  }

  // console.log(Array.from(valueMap.entries()));
  return valueMap;
}

function addToMap(
  refId: string,
  valueMap: DataFrameMap,
  values: string[],
  displayName: string,
  timestamps?: number[],
  type?: string,
  length?: number,
  dsName?: string
) {
  if (!valueMap.has(refId)) {
    valueMap.set(refId, { values: new Map(), type: type, length: length, dataSourceName: dsName });
  }

  let uniqueName = displayName;
  const refStore = valueMap.get(refId)!;

  let counter = 1;
  while (refStore.values.has(uniqueName)) {
    uniqueName = `${displayName}_${counter}`;
    counter++;
  }

  refStore.values.set(uniqueName, { values: values, timestamps: timestamps });
}

export async function getDataSourceNames(panelData: PanelData, valueMap: DataFrameMap) {
  const getDataSourceName = (uid: string | undefined) => {
    return uid ? getDataSourceSrv().getInstanceSettings(uid)?.name : undefined;
  };

  const addDSNameToMap = (refId: string, dataSourceName?: string) => {
    if (dataSourceName && valueMap.has(refId)) {
      valueMap.get(refId)!.dataSourceName = dataSourceName;
    }
  };

  if (!panelData.request?.targets) {
    return;
  }

  for (const target of panelData.request.targets) {
    if (!target.refId || !target.datasource?.uid) {
      continue;
    }

    const panelId = (target as unknown as { panelId?: number }).panelId;

    if (panelId) {
      const uid = panelData.request?.dashboardUID;
      const otherPanelDatasources = await getOriginalDataSources(uid, panelId);

      if (!otherPanelDatasources) {
        continue;
      }

      for (const ref of otherPanelDatasources) {
        if (!ref.uid || !ref.refId) {
          continue;
        }

        const dataSourceName = getDataSourceName(ref.uid);
        addDSNameToMap(ref.refId, dataSourceName);
      }
    } else {
      const dataSourceName = getDataSourceSrv().getInstanceSettings(target.datasource.uid)?.name;
      addDSNameToMap(target.refId, dataSourceName);
    }
  }
}

async function getOriginalDataSources(dashboardUid: string | undefined, panelId: number) {
  if (!dashboardUid) {
    return;
  }

  const res = await fetch(`/api/dashboards/uid/${dashboardUid}`);

  if (!res.ok) {
    return;
  }

  const dash = await res.json();
  const panel = dash.dashboard.panels.find((p: any) => p.id === panelId);

  if (!panel.targets) {
    return;
  }

  return panel.targets.map((t: any) => ({
    refId: t.refId,
    uid: t.datasource?.uid ?? (typeof t.datasource === 'string' ? t.datasource : undefined),
  }));
}

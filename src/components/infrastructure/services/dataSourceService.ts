import { getDataSourceSrv } from '@grafana/runtime';
import { PanelData } from '@grafana/data';
import { DataFrameMap } from 'components/domain/models';

/**
 * Получает оригинальные датасорсы для панели (из дашборда)
 */
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

/**
 * Обогащает DataFrameMap именами датасорсов
 */
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

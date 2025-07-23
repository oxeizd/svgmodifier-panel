import type { SelectableValue } from "@grafana/data"

export const getQueryOptions = (context: any): Array<SelectableValue<string>> => {
  const refIds = (context.data?.map((frame: any) => frame.refId).filter(Boolean) as string[]) || ["A", "B"]
  return refIds.map((refId) => ({ label: refId, value: refId }))
}
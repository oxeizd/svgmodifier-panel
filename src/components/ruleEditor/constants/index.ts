import type { SelectableValue } from "@grafana/data"

export const CALCULATION_OPTIONS: Array<SelectableValue<string>> = [
  { label: "Last", value: "last" },
  { label: "Total", value: "total" },
  { label: "Max", value: "max" },
  { label: "Min", value: "min" },
  { label: "Count", value: "count" },
  { label: "Delta", value: "delta" },
]

export const OPERATOR_OPTIONS: Array<SelectableValue<string>> = [
  { label: "=", value: "=" },
  { label: ">", value: ">" },
  { label: "<", value: "<" },
  { label: ">=", value: ">=" },
  { label: "<=", value: "<=" },
  { label: "!=", value: "!=" },
]

export const SCHEMA_OPTIONS: Array<SelectableValue<string>> = [
  { label: "Basic", value: "basic" },
  { label: "Stroke", value: "stroke" },
  { label: "Text", value: "text" },
  { label: "Fill", value: "fill" },
]
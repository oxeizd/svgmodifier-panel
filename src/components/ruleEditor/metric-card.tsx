import React from "react"
import type { SelectableValue } from "@grafana/data"
import { Field, Input, Stack, ColorPicker, IconButton } from "@grafana/ui"
import { RefIdsSection } from "./refids-section"
import { LegendsSection } from "./legends-section"
import { ThresholdsSection } from "./thresholds-section"
import { Metric } from "../types"
import { styles } from "./styles/metrics.styles"

interface MetricCardProps {
  metric: Metric
  index: number
  onUpdate: (metric: Metric) => void
  onRemove: () => void
  getQueryOptions: () => Array<SelectableValue<string>>
}

export const MetricCard: React.FC<MetricCardProps> = ({ metric, index, onUpdate, onRemove, getQueryOptions }) => {
  return (
    <div className={styles.metricCard}>
      <div className={styles.cardHeader}>
        <h6>Metric {index + 1}</h6>
        <IconButton name="trash-alt" onClick={onRemove} aria-label="Remove metric" />
      </div>

      <Stack direction="column" gap={2}>
        <Stack direction="row" gap={2}>
          <Field label="Display Text">
            <Input
              value={metric.displayText || ""}
              onChange={(e) => onUpdate({ ...metric, displayText: e.currentTarget.value })}
            />
          </Field>
          <Field label="Base Color">
            <ColorPicker
              color={metric.baseColor || "green"}
              onChange={(color) => onUpdate({ ...metric, baseColor: color })}
              enableNamedColors
            />
          </Field>
          <Field label="Decimals">
            <Input
              type="number"
              value={metric.decimal || 2}
              onChange={(e) => onUpdate({ ...metric, decimal: Number.parseInt(e.currentTarget.value) })}
              width={8}
            />
          </Field>
          <Field label="Filling">
            <Input
              value={metric.filling || ""}
              onChange={(e) => onUpdate({ ...metric, filling: e.currentTarget.value })}
              placeholder="fill, stroke, etc."
              width={12}
            />
          </Field>
        </Stack>

        <RefIdsSection
          refIds={metric.refIds || []}
          onUpdate={(refIds) => onUpdate({ ...metric, refIds })}
          getQueryOptions={getQueryOptions}
        />

        <LegendsSection legends={metric.legends || []} onUpdate={(legends) => onUpdate({ ...metric, legends })} />

        <ThresholdsSection
          thresholds={metric.thresholds || []}
          onUpdate={(thresholds) => onUpdate({ ...metric, thresholds })}
          title="Metric Thresholds"
        />
      </Stack>
    </div>
  )
}

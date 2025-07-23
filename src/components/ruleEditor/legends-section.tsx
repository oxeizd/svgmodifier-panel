import React from "react"
import { Button, Field, Input, Select, IconButton } from "@grafana/ui"
import { ThresholdsSection } from "./thresholds-section"
import type { Legends } from "../types"
import { CALCULATION_OPTIONS } from "./constants"
import { styles } from "./styles/metrics.styles"

interface LegendsSectionProps {
  legends: Legends[]
  onUpdate: (legends: Legends[]) => void
}

export const LegendsSection: React.FC<LegendsSectionProps> = ({ legends, onUpdate }) => {
  const addLegend = () => {
    const newLegend: Legends = { legend: "legend_name", calculation: "last", thresholds: [] }
    onUpdate([...legends, newLegend])
  }

  const updateLegend = (index: number, legend: Legends) => {
    const newLegends = [...legends]
    newLegends[index] = legend
    onUpdate(newLegends)
  }

  const removeLegend = (index: number) => {
    const newLegends = legends.filter((_, i) => i !== index)
    onUpdate(newLegends)
  }

  return (
    <Field label="Legends">
      <div className={styles.refIdsContainer}>
        {legends.map((legend, index) => (
          <div key={index} className={styles.refIdRow}>
            <Input
              value={legend.legend || ""}
              onChange={(e) => updateLegend(index, { ...legend, legend: e.currentTarget.value })}
              placeholder="legend name"
              width={10}
            />
            <Select
              options={CALCULATION_OPTIONS}
              value={legend.calculation}
              onChange={(v) => updateLegend(index, { ...legend, calculation: v.value as any })}
              width={10}
            />
            <Input
              value={legend.label || ""}
              onChange={(e) => updateLegend(index, { ...legend, label: e.currentTarget.value })}
              placeholder="label"
              width={12}
            />
            <Input
              value={legend.sum || ""}
              onChange={(e) => updateLegend(index, { ...legend, sum: e.currentTarget.value })}
              placeholder="sum"
              width={12}
            />
            <IconButton name="trash-alt" onClick={() => removeLegend(index)} aria-label="Remove legend" />

            <ThresholdsSection
              thresholds={legend.thresholds || []}
              onUpdate={(thresholds) => updateLegend(index, { ...legend, thresholds })}
              title={`Legend ${legend.legend} Thresholds`}
              compact
            />
          </div>
        ))}
        <Button size="sm" variant="secondary" onClick={addLegend}>
          Add Legend
        </Button>
      </div>
    </Field>
  )
}

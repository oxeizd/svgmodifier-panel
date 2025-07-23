import React from "react"
import { Button, Input, Select, IconButton } from "@grafana/ui"
import type { Threshold } from "../types"
import { OPERATOR_OPTIONS } from "./constants"
import { styles } from "./styles/metrics.styles"

interface ThresholdsSectionProps {
  thresholds: Threshold[]
  onUpdate: (thresholds: Threshold[]) => void
  title: string
  compact?: boolean
}

export const ThresholdsSection: React.FC<ThresholdsSectionProps> = ({
  thresholds,
  onUpdate,
  title,
  compact = false,
}) => {
  const addThreshold = () => {
    const newThreshold: Threshold = { color: "orange", value: 0 }
    onUpdate([...thresholds, newThreshold])
  }

  const updateThreshold = (index: number, field: keyof Threshold, value: any) => {
    const newThresholds = [...thresholds]
    newThresholds[index] = { ...newThresholds[index], [field]: value }
    onUpdate(newThresholds)
  }

  const removeThreshold = (index: number) => {
    const newThresholds = thresholds.filter((_, i) => i !== index)
    onUpdate(newThresholds)
  }

  return (
    <div className={compact ? styles.compactThresholds : styles.thresholdsSection}>
      {!compact && <h6>{title}</h6>}
      <Button size="sm" variant="secondary" onClick={addThreshold}>
        {compact ? "Add Threshold" : `Add ${title}`}
      </Button>

      {thresholds.map((threshold, index) => (
        <div key={index} className={styles.thresholdRow}>
          <Input
            value={threshold.color || ""}
            onChange={(e) => updateThreshold(index, "color", e.currentTarget.value)}
            placeholder="Color"
            width={8}
          />
          <Input
            type="number"
            value={threshold.value || 0}
            onChange={(e) => updateThreshold(index, "value", Number(e.currentTarget.value))}
            placeholder="Value"
            width={8}
          />
          {threshold.operator !== undefined && (
            <Select
              options={OPERATOR_OPTIONS}
              value={threshold.operator || "="}
              onChange={(v) => updateThreshold(index, "operator", v.value)}
              placeholder="Operator"
              width={10}
            />
          )}
          <IconButton name="trash-alt" onClick={() => removeThreshold(index)} aria-label="Delete threshold" />
        </div>
      ))}
    </div>
  )
}

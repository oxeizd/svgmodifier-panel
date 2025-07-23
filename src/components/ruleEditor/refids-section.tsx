import React from "react"
import { SelectableValue } from "@grafana/data"
import { Button, Field, Input, Select, IconButton } from "@grafana/ui"
import { ThresholdsSection } from "./thresholds-section"
import { RefIds } from "../types"
import { CALCULATION_OPTIONS } from "./constants"
import { styles } from "./styles/metrics.styles"

interface RefIdsSectionProps {
  refIds: RefIds[]
  onUpdate: (refIds: RefIds[]) => void
  getQueryOptions: () => Array<SelectableValue<string>>
}

export const RefIdsSection: React.FC<RefIdsSectionProps> = ({ refIds, onUpdate, getQueryOptions }) => {
  const addRefId = () => {
    const newRefId: RefIds = { refid: "A", calculation: "last", thresholds: [] }
    onUpdate([...refIds, newRefId])
  }

  const updateRefId = (index: number, refId: RefIds) => {
    const newRefIds = [...refIds]
    newRefIds[index] = refId
    onUpdate(newRefIds)
  }

  const removeRefId = (index: number) => {
    const newRefIds = refIds.filter((_, i) => i !== index)
    onUpdate(newRefIds)
  }

  return (
    <Field label="RefIds">
      <div className={styles.refIdsContainer}>
        {refIds.map((refId, index) => (
          <div key={index} className={styles.refIdRow}>
            <Select
              options={getQueryOptions()}
              value={refId.refid}
              onChange={(v) => updateRefId(index, { ...refId, refid: v.value || "A" })}
              width={10}
            />
            <Select
              options={CALCULATION_OPTIONS}
              value={refId.calculation}
              onChange={(v) => updateRefId(index, { ...refId, calculation: v.value as any })}
              width={10}
            />
            <Input
              value={refId.filter || ""}
              onChange={(e) => updateRefId(index, { ...refId, filter: e.currentTarget.value })}
              placeholder="filter"
              width={12}
            />
            <Input
              value={refId.title || ""}
              onChange={(e) => updateRefId(index, { ...refId, title: e.currentTarget.value })}
              placeholder="title"
              width={12}
            />
            <IconButton name="trash-alt" onClick={() => removeRefId(index)} aria-label="Remove reference" />

            <ThresholdsSection
              thresholds={refId.thresholds || []}
              onUpdate={(thresholds) => updateRefId(index, { ...refId, thresholds })}
              title={`RefId ${refId.refid} Thresholds`}
              compact
            />
          </div>
        ))}
        <Button size="sm" variant="secondary" onClick={addRefId}>
          Add RefId
        </Button>
      </div>
    </Field>
  )
}

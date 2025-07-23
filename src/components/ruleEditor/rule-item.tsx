import React from "react"
import { useState } from "react"
import { IconButton, Stack, Input, Select } from "@grafana/ui"
import type { Change } from "../types"
import { styles } from "./styles/groups.styles"

interface RuleItemProps {
  rule: Change
  index: number
  onConfigure: () => void
  onUpdate: (updatedRule: Change) => void
  onDelete: () => void
  onMove: (toGroup: string | null) => void
  availableGroups: string[]
  currentGroup: string | null
}

export const RuleItem: React.FC<RuleItemProps> = ({
  rule,
  index,
  onConfigure,
  onUpdate,
  onDelete,
  onMove,
  availableGroups,
  currentGroup,
}) => {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(rule.rule || "")
  const [showMoveSelect, setShowMoveSelect] = useState(false)

  const handleNameSave = () => {
    onUpdate({ ...rule, rule: editName.trim() || `Rule ${Date.now()}` })
    setIsEditingName(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave()
    } else if (e.key === "Escape") {
      setEditName(rule.rule || "")
      setIsEditingName(false)
    }
  }

  const getRuleId = (rule: Change): string => {
    return Array.isArray(rule.id) ? rule.id.join(", ") : rule.id
  }

  const moveOptions = [
    { label: "Ungrouped", value: null },
    ...availableGroups.filter((group) => group !== currentGroup).map((group) => ({ label: group, value: group })),
  ]

  return (
    <div className={styles.ruleItem}>
      <div className={styles.ruleInfo}>
        <div className={styles.ruleName}>
          {isEditingName ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.currentTarget.value)}
              onBlur={handleNameSave}
              onKeyDown={handleKeyDown}
              placeholder="Rule name"
              autoFocus
              width={20}
            />
          ) : (
            <div onClick={() => setIsEditingName(true)} className={styles.editableName}>
              <strong>{rule.rule || "Unnamed Rule"}</strong>
              <IconButton name="edit" size="xs" aria-label="Edit name" />
            </div>
          )}
        </div>
        <div className={styles.ruleId}>ID: {getRuleId(rule)}</div>
      </div>

      <div className={styles.ruleActions}>
        {showMoveSelect ? (
          <Stack direction="row" gap={1}>
            <Select
              options={moveOptions}
              onChange={(option) => {
                onMove(option.value ?? null)
                setShowMoveSelect(false)
              }}
              placeholder="Move to..."
              width={15}
            />
            <IconButton name="times" onClick={() => setShowMoveSelect(false)} aria-label="Cancel move" size="sm" />
          </Stack>
        ) : (
          <Stack direction="row" gap={1}>
            <IconButton
              name="arrow-right"
              onClick={() => setShowMoveSelect(true)}
              aria-label="Move rule"
              tooltip="Move to group"
              size="sm"
            />
            <IconButton
              name="cog"
              onClick={onConfigure}
              aria-label="Configure rule"
              tooltip="Configure rule"
              size="sm"
            />
            <IconButton name="trash-alt" onClick={onDelete} aria-label="Delete rule" tooltip="Delete rule" size="sm" />
          </Stack>
        )}
      </div>
    </div>
  )
}

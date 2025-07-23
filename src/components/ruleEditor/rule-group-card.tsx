import React from "react"
import { useState } from "react"
import { Button, IconButton, Input } from "@grafana/ui"
import { RuleItem } from "./rule-item"
import { RuleGroup, Change } from "../types"
import { styles } from "./styles/groups.styles"

interface RuleGroupCardProps {
  group: RuleGroup
  isUngrouped?: boolean
  onRename?: (newName: string) => void
  onDelete?: () => void
  onToggleCollapse?: () => void
  onConfigureRule: (rule: Change, ruleIndex: number) => void
  onUpdateRule: (ruleIndex: number, updatedRule: Change) => void
  onDeleteRule: (ruleIndex: number) => void
  onMoveRule: (rule: Change, fromIndex: number, toGroup: string | null) => void
  onAddRule?: () => void
  availableGroups: string[]
}

export const RuleGroupCard: React.FC<RuleGroupCardProps> = ({
  group,
  isUngrouped = false,
  onRename,
  onDelete,
  onToggleCollapse,
  onConfigureRule,
  onUpdateRule,
  onDeleteRule,
  onMoveRule,
  onAddRule,
  availableGroups,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(group.name)

  const handleRename = () => {
    const trimmedName = editName.trim()
    if (onRename && trimmedName && trimmedName !== group.name) {
      onRename(trimmedName)
    }
    setIsEditing(false)
  }

  const isCollapsed = group.collapsed && !isUngrouped
  const isEmpty = group.rules.length === 0

  return (
    <div
      className={`${styles.groupCard} ${isUngrouped ? styles.ungroupedCard : ""} ${isCollapsed ? styles.collapsedCard : ""} ${isEmpty && !isUngrouped ? styles.emptyGroupCard : ""}`}
    >
      <div className={styles.groupHeader}>
        <div className={styles.groupTitle}>
          {!isUngrouped && onToggleCollapse && (
            <IconButton name={group.collapsed ? "angle-right" : "angle-down"} onClick={onToggleCollapse} size="sm" aria-label=""/> 
          )}

          {isEditing && !isUngrouped ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.currentTarget.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename()
                if (e.key === "Escape") {
                  setEditName(group.name)
                  setIsEditing(false)
                }
              }}
              autoFocus
              width={20}
            />
          ) : (
            <h6 onClick={() => !isUngrouped && setIsEditing(true)}>
              {group.name} ({group.rules.length})
              {isEmpty && !isUngrouped && <span className={styles.emptyIndicator}>empty</span>}
            </h6>
          )}
        </div>

        {!isUngrouped && (
          <div className={styles.groupActions}>
            {onAddRule && (
              <>
                <Button size="sm" variant="secondary" onClick={onAddRule}>
                  Add Rule
                </Button>
              </>
            )}
            <IconButton name="edit" onClick={() => setIsEditing(true)} size="sm" aria-label=""/>
            {onDelete && <IconButton name="trash-alt" onClick={onDelete} size="sm" aria-label=""/>}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className={styles.rulesContainer}>
          {group.rules.map((rule, index) => (
            <RuleItem
              key={`${rule.id}-${index}`}
              rule={rule}
              index={index}
              onConfigure={() => onConfigureRule(rule, index)}
              onUpdate={(updatedRule) => onUpdateRule(index, updatedRule)}
              onDelete={() => onDeleteRule(index)}
              onMove={(toGroup) => onMoveRule(rule, index, toGroup)}
              availableGroups={availableGroups}
              currentGroup={isUngrouped ? null : group.name}
            />
          ))}

          {isEmpty && (
            <div className={styles.emptyGroup}>
              <p>No rules in this group</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

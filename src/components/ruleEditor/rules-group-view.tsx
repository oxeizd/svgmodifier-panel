import React from "react"
import { useState } from "react"
import { Button, Stack, Input, Modal } from "@grafana/ui"
import { RuleGroupCard } from "./rule-group-card"
import type { GroupedRules, RuleGroup, Change } from "../types"
import { styles } from "./styles/groups.styles"
import { SelectableValue } from "@grafana/data"

interface RulesGroupViewProps {
  groupedRules: GroupedRules;
  onUpdateGroupedRules: (groupedRules: GroupedRules) => void;
  onConfigureRule: (rule: Change, groupName?: string, ruleIndex?: number) => void;
  onAddRule: (groupName?: string) => void;
  getQueryOptions?: () => SelectableValue<string>[]; // Add this line
}


export const RulesGroupView: React.FC<RulesGroupViewProps> = ({
  groupedRules,
  onUpdateGroupedRules,
  onConfigureRule,
  onAddRule,
}) => {
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  const createGroup = () => {
    if (!newGroupName.trim()) return

    const newGroup: RuleGroup = {
      name: newGroupName.trim(),
      rules: [],
      collapsed: false,
    }

    onUpdateGroupedRules({
      ...groupedRules,
      groups: [...groupedRules.groups, newGroup],
    })

    setNewGroupName("")
    setShowCreateGroup(false)
  }

  const deleteGroup = (groupName: string) => {
    const group = groupedRules.groups.find((g) => g.name === groupName)
    if (!group) return

    onUpdateGroupedRules({
      groups: groupedRules.groups.filter((g) => g.name !== groupName),
      ungrouped: [...groupedRules.ungrouped, ...group.rules.map((rule) => ({ ...rule, group: "" }))],
    })
  }

  const renameGroup = (oldName: string, newName: string) => {
    const trimmedName = newName.trim()
    if (!trimmedName || oldName === trimmedName) return

    onUpdateGroupedRules({
      ...groupedRules,
      groups: groupedRules.groups.map((group) =>
        group.name === oldName
          ? {
              ...group,
              name: trimmedName,
              rules: group.rules.map((rule) => ({ ...rule, group: trimmedName })),
            }
          : group,
      ),
    })
  }

  const toggleGroupCollapse = (groupName: string) => {
    onUpdateGroupedRules({
      ...groupedRules,
      groups: groupedRules.groups.map((group) =>
        group.name === groupName ? { ...group, collapsed: !group.collapsed } : group,
      ),
    })
  }

  const moveRule = (rule: Change, fromGroup: string | null, toGroup: string | null, fromIndex: number) => {
    const newGroupedRules = { ...groupedRules }

    // Remove from source
    if (fromGroup) {
      const sourceGroup = newGroupedRules.groups.find((g) => g.name === fromGroup)
      if (sourceGroup) sourceGroup.rules.splice(fromIndex, 1)
    } else {
      newGroupedRules.ungrouped.splice(fromIndex, 1)
    }

    // Add to target
    const updatedRule = { ...rule, group: toGroup || "" }
    if (toGroup) {
      const targetGroup = newGroupedRules.groups.find((g) => g.name === toGroup)
      if (targetGroup) targetGroup.rules.push(updatedRule)
    } else {
      newGroupedRules.ungrouped.push(updatedRule)
    }

    onUpdateGroupedRules(newGroupedRules)
  }

  const updateRule = (groupName: string | null, ruleIndex: number, updatedRule: Change) => {
    const newGroupedRules = { ...groupedRules }

    if (groupName) {
      const group = newGroupedRules.groups.find((g) => g.name === groupName)
      if (group?.rules[ruleIndex]) {
        group.rules[ruleIndex] = { ...updatedRule, group: groupName }
      }
    } else if (newGroupedRules.ungrouped[ruleIndex]) {
      newGroupedRules.ungrouped[ruleIndex] = { ...updatedRule, group: "" }
    }

    onUpdateGroupedRules(newGroupedRules)
  }

  const deleteRule = (groupName: string | null, ruleIndex: number) => {
    const newGroupedRules = { ...groupedRules }

    if (groupName) {
      const group = newGroupedRules.groups.find((g) => g.name === groupName)
      if (group) group.rules.splice(ruleIndex, 1)
    } else {
      newGroupedRules.ungrouped.splice(ruleIndex, 1)
    }

    onUpdateGroupedRules(newGroupedRules)
  }

  const totalRules =
    groupedRules.groups.reduce((sum, group) => sum + group.rules.length, 0) + groupedRules.ungrouped.length

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.ruleCount}>
          {totalRules} rules in {groupedRules.groups.length} groups
        </span>
        <div className={styles.headerRight}>
          <Button size="sm" variant="secondary" onClick={() => setShowCreateGroup(true)}>
            Create Group
          </Button>
          <Button size="sm" onClick={() => onAddRule()}>
            Add Rule
          </Button>
        </div>
      </div>

      <div className={styles.groupsContainer}>
        {groupedRules.groups.map((group, groupIndex) => (
          <RuleGroupCard
            key={`${group.name}-${groupIndex}`}
            group={group}
            onRename={(newName) => renameGroup(group.name, newName)}
            onDelete={() => deleteGroup(group.name)}
            onToggleCollapse={() => toggleGroupCollapse(group.name)}
            onConfigureRule={(rule, ruleIndex) => onConfigureRule(rule, group.name, ruleIndex)}
            onUpdateRule={(ruleIndex, updatedRule) => updateRule(group.name, ruleIndex, updatedRule)}
            onDeleteRule={(ruleIndex) => deleteRule(group.name, ruleIndex)}
            onMoveRule={(rule, fromIndex, toGroup) => moveRule(rule, group.name, toGroup, fromIndex)}
            onAddRule={() => onAddRule(group.name)}
            availableGroups={groupedRules.groups.map((g) => g.name)}
          />
        ))}

        {groupedRules.ungrouped.length > 0 && (
          <RuleGroupCard
            group={{ name: "Ungrouped Rules", rules: groupedRules.ungrouped }}
            isUngrouped
            onConfigureRule={(rule, ruleIndex) => onConfigureRule(rule, undefined, ruleIndex)}
            onUpdateRule={(ruleIndex, updatedRule) => updateRule(null, ruleIndex, updatedRule)}
            onDeleteRule={(ruleIndex) => deleteRule(null, ruleIndex)}
            onMoveRule={(rule, fromIndex, toGroup) => moveRule(rule, null, toGroup, fromIndex)}
            availableGroups={groupedRules.groups.map((g) => g.name)}
          />
        )}

        {totalRules === 0 && groupedRules.groups.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <h6>No Rules Configured</h6>
            <p>Create your first group and rules to start mapping metrics to SVG elements.</p>
            <Stack direction="row" gap={2} justifyContent="center">
              <Button onClick={() => setShowCreateGroup(true)}>Create Group</Button>
              <Button variant="secondary" onClick={() => onAddRule()}>
                Add Rule
              </Button>
            </Stack>
          </div>
        )}
      </div>

      <Modal title="Create New Group" isOpen={showCreateGroup} onDismiss={() => setShowCreateGroup(false)}>
        <div className={styles.createGroupModal}>
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.currentTarget.value)}
            placeholder="Enter group name"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && createGroup()}
          />
          <div style={{ marginTop: "16px" }}>
            <Stack direction="row" gap={2} justifyContent="flex-end">
              <Button variant="secondary" onClick={() => setShowCreateGroup(false)}>
                Cancel
              </Button>
              <Button onClick={createGroup} disabled={!newGroupName.trim()}>
                Create
              </Button>
            </Stack>
          </div>
        </div>
      </Modal>
    </div>
  )
}

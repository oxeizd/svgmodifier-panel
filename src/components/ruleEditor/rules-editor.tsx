import React from "react"
import { useState, useEffect } from "react"
import type { StandardEditorProps } from "@grafana/data"
import { RadioButtonGroup } from "@grafana/ui"
import { RuleConfigModal } from "./rule-config-modal"
import { YamlEditorView } from "./yaml-editor-view"
import { getQueryOptions } from "./utils/query-utils"
import type { Change } from "../types"
import { styles } from "./styles/rules-editor.styles"
import { parseYamlToGroupedRules, groupedRulesToYaml } from "./utils/yaml-utils"
import { RulesGroupView } from "./rules-group-view"
import type { GroupedRules } from "../types"

const MODE_OPTIONS = [
  { label: "Visual Editor", value: "visual" },
  { label: "YAML Editor", value: "yaml" },
]

export const RulesEditor: React.FC<StandardEditorProps<string>> = ({ value, onChange, context }) => {
  const [mode, setMode] = useState<"visual" | "yaml">("visual")
  const [editingRule, setEditingRule] = useState<{ rule: Change; index: number; groupName?: string } | null>(null)
  const [groupedRules, setGroupedRules] = useState<GroupedRules>({ groups: [], ungrouped: [] })
  const [yamlConfig, setYamlConfig] = useState(value || "")

  // Initialize on load
  useEffect(() => {
    const grouped = parseYamlToGroupedRules(value || "")
    setGroupedRules(grouped)
    setYamlConfig(value || "")
  }, [value])

  // Sync when switching modes
  useEffect(() => {
    if (mode === "visual") {
      const grouped = parseYamlToGroupedRules(yamlConfig)
      setGroupedRules(grouped)
    }
  }, [mode, yamlConfig])

  const updateGroupedRules = (newGroupedRules: GroupedRules) => {
    setGroupedRules(newGroupedRules)
    const newYaml = groupedRulesToYaml(newGroupedRules)
    setYamlConfig(newYaml)
    onChange(newYaml)
  }

  const handleYamlChange = (newYaml: string) => {
    setYamlConfig(newYaml)
    onChange(newYaml)
  }

  const handleAddRule = (groupName?: string) => {
    const newRule: Change = {
      rule: `Rule ${Date.now()}`,
      group: groupName || "",
      id: `rule-${Date.now()}`,
      attributes: {
        metrics: [],
      },
    }

    const newGroupedRules = { ...groupedRules }

    if (groupName) {
      const group = newGroupedRules.groups.find((g) => g.name === groupName)
      if (group) {
        group.rules.push(newRule)
      }
    } else {
      newGroupedRules.ungrouped.push(newRule)
    }

    updateGroupedRules(newGroupedRules)
  }

  const handleUpdateRule = (updatedRule: Change, groupName?: string, ruleIndex?: number) => {
    if (groupName !== undefined && ruleIndex !== undefined) {
      const newGroupedRules = { ...groupedRules }

      if (groupName) {
        const group = newGroupedRules.groups.find((g) => g.name === groupName)
        if (group && group.rules[ruleIndex]) {
          group.rules[ruleIndex] = updatedRule
        }
      } else {
        if (newGroupedRules.ungrouped[ruleIndex]) {
          newGroupedRules.ungrouped[ruleIndex] = updatedRule
        }
      }

      updateGroupedRules(newGroupedRules)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h5>Metrics Mapping Configuration</h5>
          <div className={styles.modeSelector}>
            <RadioButtonGroup
              options={MODE_OPTIONS}
              value={mode}
              onChange={(value) => setMode(value as "visual" | "yaml")}
              size="sm"
            />
          </div>
        </div>
      </div>

      {mode === "visual" ? (
        <>
          <RulesGroupView
            groupedRules={groupedRules}
            onUpdateGroupedRules={updateGroupedRules}
            onConfigureRule={(rule, groupName, ruleIndex) => {
              setEditingRule({ rule, index: ruleIndex || 0, groupName })
            }}
            onAddRule={handleAddRule}
            getQueryOptions={() => getQueryOptions(context)}
          />

          {editingRule && (
            <RuleConfigModal
              rule={editingRule.rule}
              isOpen={!!editingRule}
              onClose={() => setEditingRule(null)}
              onSave={(updatedRule) => {
                handleUpdateRule(updatedRule, editingRule.groupName, editingRule.index)
                setEditingRule(null)
              }}
              getQueryOptions={() => getQueryOptions(context)}
            />
          )}
        </>
      ) : (
        <YamlEditorView yamlConfig={yamlConfig} onYamlChange={handleYamlChange} />
      )}
    </div>
  )
}

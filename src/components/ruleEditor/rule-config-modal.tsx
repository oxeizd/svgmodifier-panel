import  React from "react"
import { useState, useEffect } from "react"
import type { SelectableValue } from "@grafana/data"
import { Button, Field, Input, Switch, Stack, ColorPicker, Select, TabsBar, Tab, Modal, TextArea } from "@grafana/ui"
import { MetricsTab } from "./metrics-tab"
import type { Change, Tooltip } from "../types"
import { styles } from "./styles/modal.styles"

interface RuleConfigModalProps {
  rule: Change | null
  isOpen: boolean
  onClose: () => void
  onSave: (rule: Change) => void
  getQueryOptions: () => Array<SelectableValue<string>>
}

export const RuleConfigModal: React.FC<RuleConfigModalProps> = ({ rule, isOpen, onClose, onSave, getQueryOptions }) => {
  const [editRule, setEditRule] = useState<Change | null>(rule)
  const [activeTab, setActiveTab] = useState("general")

  useEffect(() => {
    setEditRule(rule)
    if (rule) {
      setActiveTab("general")
    }
  }, [rule])

  if (!editRule) return null

  const updateRule = (updates: Partial<Change>) => {
    setEditRule({ ...editRule, ...updates })
  }

  const updateAttribute = (key: keyof Change["attributes"], value: any) => {
    setEditRule({
      ...editRule,
      attributes: { ...editRule.attributes, [key]: value },
    })
  }

  const handleSave = () => {
    if (editRule) {
      onSave(editRule)
      onClose()
    }
  }

  return (
    <Modal title={`Configure Rule: ${editRule.rule}`} isOpen={isOpen} onDismiss={onClose}>
      <div className={styles.configModal}>
        <TabsBar>
          <Tab label="General" active={activeTab === "general"} onChangeTab={() => setActiveTab("general")} />
          <Tab label="Metrics" active={activeTab === "metrics"} onChangeTab={() => setActiveTab("metrics")} />
          <Tab label="Tooltip" active={activeTab === "tooltip"} onChangeTab={() => setActiveTab("tooltip")} />
        </TabsBar>

        <div className={styles.tabContent}>
          {activeTab === "general" && (
            <Stack direction="column" gap={3}>
              <Field label="Rule Name">
                <Input
                  value={editRule.rule}
                  onChange={(e) => updateRule({ rule: e.currentTarget.value })}
                  placeholder="Enter rule name"
                />
              </Field>

              <Field label="Element ID(s)" description="Single ID or comma-separated list">
                <Input
                  value={Array.isArray(editRule.id) ? editRule.id.join(", ") : editRule.id}
                  onChange={(e) => {
                    const value = e.currentTarget.value
                    const ids = value.includes(",") ? value.split(",").map((s) => s.trim()) : value
                    updateRule({ id: ids })
                  }}
                  placeholder="cell1, cell2 or single-id"
                />
              </Field>

              <Stack direction="row" gap={2}>
                <Field label="Auto Config">
                  <Switch
                    value={editRule.attributes.autoConfig || false}
                    onChange={(e) => updateAttribute("autoConfig", e.currentTarget.checked)}
                  />
                </Field>
              </Stack>

              <Field label="Link" description="URL or comma-separated URLs">
                <Input
                  value={
                    Array.isArray(editRule.attributes.link)
                      ? editRule.attributes.link.join(", ")
                      : editRule.attributes.link || ""
                  }
                  onChange={(e) => {
                    const value = e.currentTarget.value
                    if (!value) {
                      updateAttribute("link", undefined)
                    } else {
                      const links = value.includes(",") ? value.split(",").map((s) => s.trim()) : value
                      updateAttribute("link", links)
                    }
                  }}
                />
              </Field>

              <Stack direction="row" gap={2}>
                <Field label="Label">
                  <Input
                    value={editRule.attributes.label || ""}
                    onChange={(e) => updateAttribute("label", e.currentTarget.value)}
                    placeholder="Label text"
                  />
                </Field>
                <Field label="Label Color">
                  <ColorPicker
                    color={editRule.attributes.labelColor || "#000000"}
                    onChange={(color) => updateAttribute("labelColor", color)}
                  />
                </Field>
              </Stack>
            </Stack>
          )}

          {activeTab === "metrics" && (
            <MetricsTab
              metrics={editRule.attributes.metrics || []}
              onUpdateMetrics={(metrics) => updateAttribute("metrics", metrics)}
              getQueryOptions={getQueryOptions}
            />
          )}

          {activeTab === "tooltip" && (
            <Stack direction="column" gap={3}>
              <Field label="Show Tooltip">
                <Switch
                  value={editRule.attributes.tooltip?.show || false}
                  onChange={(e) => {
                    const tooltip: Tooltip = {
                      ...(editRule.attributes.tooltip || {}),
                      show: e.currentTarget.checked,
                    }
                    updateAttribute("tooltip", tooltip)
                  }}
                />
              </Field>

              {editRule.attributes.tooltip?.show && (
                <>
                  <Field label="Text Above">
                    <TextArea
                      value={editRule.attributes.tooltip?.textAbove || ""}
                      onChange={(e) => {
                        const tooltip: Tooltip = {
                          show: editRule.attributes.tooltip?.show ?? true,
                          textBelow: editRule.attributes.tooltip?.textBelow,
                          textAbove: e.currentTarget.value,
                        }
                        updateAttribute("tooltip", tooltip)
                      }}
                      placeholder="Text to show above metrics"
                      rows={3}
                    />
                  </Field>

                  <Field label="Text Below">
                    <TextArea
                      value={editRule.attributes.tooltip?.textBelow || ""}
                      onChange={(e) => {
                        const tooltip: Tooltip = {
                          show: editRule.attributes.tooltip?.show ?? true,
                          textAbove: editRule.attributes.tooltip?.textAbove,
                          textBelow: e.currentTarget.value,
                        }
                        updateAttribute("tooltip", tooltip)
                      }}
                      placeholder="Text to show below metrics"
                      rows={3}
                    />
                  </Field>
                </>
              )}
            </Stack>
          )}
        </div>

        <div className={styles.modalFooter}>
          <Stack direction="row" gap={2} justifyContent="flex-end">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Configuration</Button>
          </Stack>
        </div>
      </div>
    </Modal>
  )
}

import YAML from "yaml"
import type { Change, GroupedRules, RuleGroup } from "components/types"

export const parseYamlToRules = (yamlString: string): Change[] => {
  try {
    if (!yamlString.trim()) return []
    const parsed = YAML.parse(yamlString)
    return parsed?.changes || []
  } catch (error) {
    console.warn("Failed to parse YAML:", error)
    return []
  }
}

export const rulesToYaml = (rules: Change[]): string => {
  try {
    if (rules.length === 0) return ""
    return YAML.stringify({ changes: rules }, { indent: 2 })
  } catch (error) {
    console.warn("Failed to generate YAML:", error)
    return ""
  }
}

export const parseYamlToGroupedRules = (yamlString: string): GroupedRules => {
  try {
    const rules = parseYamlToRules(yamlString)
    const groups: RuleGroup[] = []
    const ungrouped: Change[] = []
    const groupMap = new Map<string, RuleGroup>()

    for (const rule of rules) {
      if (rule.group?.trim()) {
        const groupName = rule.group.trim()

        if (!groupMap.has(groupName)) {
          const newGroup: RuleGroup = {
            name: groupName,
            rules: [],
            collapsed: false,
          }
          groupMap.set(groupName, newGroup)
          groups.push(newGroup)
        }

        groupMap.get(groupName)!.rules.push(rule)
      } else {
        ungrouped.push(rule)
      }
    }

    return { groups, ungrouped }
  } catch (error) {
    console.warn("Failed to parse YAML to grouped rules:", error)
    return { groups: [], ungrouped: [] }
  }
}

export const groupedRulesToYaml = (groupedRules: GroupedRules): string => {
  try {
    const allRules: Change[] = []

    for (const group of groupedRules.groups) {
      for (const rule of group.rules) {
        allRules.push({ ...rule, group: group.name })
      }
    }

    for (const rule of groupedRules.ungrouped) {
      allRules.push({ ...rule, group: "" })
    }

    return rulesToYaml(allRules)
  } catch (error) {
    console.warn("Failed to generate YAML from grouped rules:", error)
    return ""
  }
}

export const flattenGroupedRules = (groupedRules: GroupedRules): Change[] => {
  const allRules: Change[] = []
  for (const group of groupedRules.groups) {
    allRules.push(...group.rules)
  }
  allRules.push(...groupedRules.ungrouped)
  return allRules
}

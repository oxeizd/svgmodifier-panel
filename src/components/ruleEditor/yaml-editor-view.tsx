import React from "react"
import YamlEditor from "./yamlEditor/yamlEditor"
import { configSchema } from "./yamlEditor/yamlSchema"
import { styles } from "./styles/yaml-editor.styles"

interface YamlEditorViewProps {
  yamlConfig: string
  onYamlChange: (yaml: string) => void
}

export const YamlEditorView: React.FC<YamlEditorViewProps> = ({ yamlConfig, onYamlChange }) => {

  return (
    <div className={styles.yamlEditor}>
      <YamlEditor
        value={yamlConfig}
        onChange={(value) => onYamlChange(value || "")}
        context={{
          schemas: configSchema,
          data: [],
          options: {},
        }}
      />
    </div>
  )
}

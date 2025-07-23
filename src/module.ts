import { PanelPlugin } from "@grafana/data"
import type { PanelOptions } from "components/types"
import SvgPanel from "components/svgPanel"
import { RulesEditor } from "components/ruleEditor/rules-editor"

export const plugin = new PanelPlugin<PanelOptions>(SvgPanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: "svgCode",
      name: "SVG Code",
      settings: {
        rows: 2,
        useTextarea: true,
      },
    })
    .addCustomEditor({
      id: "metricsMapping",
      path: "metricsMapping",
      name: "",
      editor: RulesEditor,
      defaultValue: "",
    })
})

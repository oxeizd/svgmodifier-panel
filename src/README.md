# SVG Modifier

**SVG Modifier** is a plugin for Grafana that allows users to visualize data in SVG format. The plugin processes SVG images, changes the colors of elements based on metrics and threshold values, and adds interactive elements such as tooltips and links.
![image](https://github.com/oxeizd/svgmodifier-panel/blob/main/src/img/example.png)

## Functional Features

### Dynamic SVG Modification

The plugin allows users to change the colors of SVG elements based on metrics and set threshold values for metrics, enabling the visual highlighting of critical states. Users can customize color schemes and styles according to metric values, helping them respond quickly to changes.

### Tooltips

The plugin supports the display of tooltips that show information about metrics when hovering over SVG elements. This allows users to obtain additional information without the need to navigate to other panels or pages.

### Interactive Links

The ability to add interactive links to SVG elements enables users to navigate to additional information or other panels.

## How to use

### Create Your SVG Image Using the `svgdata.js` Plugin in App Diagrams (Draw.io)

#### Steps to Create an SVG Image

1. **Create Your SVG Image**  
   Go to the [App Diagrams](https://app.diagrams.net/) website and create a new document or open an existing one.

2. **Integrate with the `svgdata.js` Plugin**  
   After creating the image in App Diagrams, it can be enabled under the "Advanced" > "Plugins" tab. Select the `svgdata.js` plugin for dynamic element modification.

3. **Assign Identifiers (IDs) to Elements**  
   Select the elements and assign them unique identifiers in the properties panel on the right.

4. **Get the Code of Your SVG Image**  
   Copy the code of your SVG image and paste it into the "SVG Code" field in the plugin.

### Correct the YAML file for dynamic updates of elements.

##### Example YAML config: [https://github.com/oxeizd/svgmodifier-panel/blob/main/templates/cfg.yaml](https://github.com/oxeizd/svgmodifier-panel/blob/main/templates/cfg.yaml)

| Attributes  | Description                                    | Syntax                                                                                                     |
| ----------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| link        | URL to which the cell links                    | `link: "http://example.com/1"`                                                                             |
| tooltip     | Controls the visibility of the tooltip         | `show: true / false`                                                                                       |
| metrics     | Collection of metrics associated with the cell | `metrics: [ { refIds: [...], legends: [...], baseColor: "color", decimal: 'number', thresholds: [...] } ]` |
| refIds      | List of reference IDs for metrics              | `refIds: [ { refid: "A" }, { refid: "B", sum: 'sum values' }, { refid: "C", filter: 'cpu' } ]`             |
| legends     | Descriptive labels for the metrics             | `legends: [ { legend: "legendname", filter: "cpu, cpu2", sum: '' } ]`                                      |
| baseColor   | Default color for the metrics display          | `baseColor: "color"`                                                                                       |
| decimal     | Number of decimal places to display            | `decimal: 'number'`                                                                                        |
| thresholds  | Conditions for color coding based on values    | `thresholds: [ { color: "color", value: number, condition: "condition" } ]`                                |
| displayText | Text displayed in the cell                     | `displayText: 'text'`                                                                                      |
| condition   | Condition for applying thresholds              | `condition: "hour === 5 && minute >= 10 && hour === 5 && minute < 47"`                                     |

### Example Usage:

```yaml
changes:
  - id: 'cell-2'
    attributes:
      link: 'http://example.com/1'
      tooltip:
        show: true
      metrics:
        - refIds:
            - { refid: 'A' }
            - { refid: 'B', sum: 'sum values' }
            - { refid: 'C', filter: 'cpu' }
          legends:
            - { legend: 'legendname', filter: 'cpu, cpu2', sum: '' }
          baseColor: 'green'
          decimal: '0'
          thresholds:
            - { color: 'red', value: 0.01, condition: 'hour === 5 && minute >= 10 && hour === 5 && minute < 47' }
            - { color: 'orange', value: 20 }
```
<!-- To help maximize the impact of your README and improve usability for users, we propose the following loose structure:

**BEFORE YOU BEGIN**
- Ensure all links are absolute URLs so that they will work when the README is displayed within Grafana and Grafana.com
- Be inspired ✨
  - [grafana-polystat-panel](https://github.com/grafana/grafana-polystat-panel)
  - [volkovlabs-variable-panel](https://github.com/volkovlabs/volkovlabs-variable-panel)

**ADD SOME BADGES**

Badges convey useful information at a glance for users whether in the Catalog or viewing the source code. You can use the generator on [Shields.io](https://shields.io/badges/dynamic-json-badge) together with the Grafana.com API
to create dynamic badges that update automatically when you publish a new version to the marketplace.

- For the URL parameter use `https://grafana.com/api/plugins/your-plugin-id`.
- Example queries:
  - Downloads: `$.downloads`
  - Catalog Version: `$.version`
  - Grafana Dependency: `$.grafanaDependency`
  - Signature Type: `$.versionSignatureType`
- Optionally, for the logo parameter use `grafana`.

Full example: ![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?logo=grafana&query=$.version&url=https://grafana.com/api/plugins/grafana-polystat-panel&label=Marketplace&prefix=v&color=F47A20)

Consider other [badges](https://shields.io/badges) as you feel appropriate for your project.

## Overview / Introduction
Provide one or more paragraphs as an introduction to your plugin to help users understand why they should use it.

Consider including screenshots:
- in [plugin.json](https://grafana.com/developers/plugin-tools/reference/plugin-json#info) include them as relative links.
- in the README ensure they are absolute URLs.

## Requirements
List any requirements or dependencies they may need to run the plugin.

## Getting Started
Provide a quick start on how to configure and use the plugin.

## Documentation
If your project has dedicated documentation available for users, provide links here. For help in following Grafana's style recommendations for technical documentation, refer to our [Writer's Toolkit](https://grafana.com/docs/writers-toolkit/).

## Contributing
Do you want folks to contribute to the plugin or provide feedback through specific means? If so, tell them how!
-->

```

```

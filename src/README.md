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

| Attributes   | Description                                    | Syntax                                                                                         |
| ------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| link?        | URL to which the cell links                    | `link: "http://example.com/1"`                                                                 |
| tooltip?     | Controls the visibility of the tooltip         | `show: true / false`                                                                           |
| metrics?:    | Collection of metrics associated with the cell |                                                                                                |
| refIds?:     | List of reference IDs for metrics              |                                                                                                |
| refid        | refid                                          | `refIds: [ { refid: "A" }, { refid: "B", sum: 'sum values' }, { refid: "C", filter: 'cpu' } ]` |
| filter?      | filter metrics                                 | `filter: "cpu, cpu2"` $date, $date-number                                                      |
| sum?         | sum all metrics                                | `sum: random name`                                                                             |
| legends?:    | Descriptive labels for the metrics             |                                                                                                |
| legend       | legend name                                    | `legends: [ { legend: "legendname", filter: "cpu, cpu2", sum: '' } ]`                          |
| filter?      | filter metrics                                 | `filter: "cpu, cpu2"` $date, $date-number                                                      |
| sum?         | sum all metrics                                | `sum: random name`                                                                             |
| baseColor?   | Default color for the metrics display          | `baseColor: "color"`                                                                           |
| decimal?     | Number of decimal places to display            | `decimal: 'number'`                                                                            |
| displayText? | Text displayed in the cell                     | `displayText: 'text'`                                                                          |
| thresholds:  | Conditions for color coding based on values    | `thresholds: [ { color: "color", value: number, condition: "condition" } ]`                    |
| color        | color svg element                              | `color: "color"`                                                                               |
| value        |                                                | `value: number`                                                                                |
| condition?   | Condition for applying thresholds              | hour?, minute?, dayOfWeek?, timezone? example: `condition: "hour === 5 && minute >= 15"`       |

##### Example YAML config: [https://github.com/oxeizd/svgmodifier-panel/blob/main/templates/cfg.yaml](https://github.com/oxeizd/svgmodifier-panel/blob/main/templates/cfg.yaml)

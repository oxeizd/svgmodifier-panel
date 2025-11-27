# SVG Modifier

**SVG Modifier** is a plugin for Grafana that allows users to visualize data in SVG format. The plugin processes SVG images, changes the colors of elements based on metrics and threshold values, and adds interactive elements such as tooltips and links.

![image](https://github.com/oxeizd/svgmodifier-panel/blob/main/src/img/example.png)

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

#### You can find the template and structure at the following link: [Templates](https://github.com/oxeizd/svgmodifier-panel/tree/main/templates).

## Complete Parameters Reference

### Parameters Reference Table

| Parameter    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| changes:     | Block of parameters and rules (used only once)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| id:          | Unique Identifiers for Each Component.<br>The parameter specifies the IDs of SVG elements for which rules will be written, starting with the prefix 'cell-'. It supports REGEX.<br><br>Additionally, the parameter supports the structure: id: 'svgid:schema?:metrics?'<br><br>Schemas:<br>basic: Basic schema with tooltip and color.<br>stroke: Line coloring when crossing threshold limits.<br>strokeBase: Line coloring with highlighting of the base color.<br>text: For text elements.<br>table: For text in tables, colors the background by 20% and the text.<br><br>Metrics:<br>@all: All metrics.<br>r@1: First metric (refid 1).<br>l@1: First legend (legend 1).<br>r@1,2,3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | l@4,5: Combined use of metrics. |
| attributes   | Add-on for component settings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| autoConfig   | Auto-tuning for rules with multiple metrics<br>Auto-tuning is enabled for rules that use multiple metrics and identifiers (id). This option allows metrics to be distributed across several SVG elements, assigning only one metric to each id.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| label        | Text label for SVG components<br>The label parameter is used to set a text label that will be displayed on the component.<br>It can take two formats:<br><br>label: 'replace': replaces the current text with the metric value.<br>label: '': allows specifying any text to be displayed on the element.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| labelColor   | Label color for SVG components<br>The labelColor parameter defines the color of the label associated with the component. It can take the following values:<br><br>labelColor: 'metric': replaces the element's color with the color of the current threshold, if available, or sets the base color.<br>labelColor: : allows specifying any color in the format:<br>RGB (e.g., rgb(255, 0, 0))<br>Color name (e.g., red, orange)<br>HEX code (e.g., #FF0000)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| valueMapping | Conditions for displaying labels<br>The condition parameter links conditions with labels for their display. All parameters are mandatory:<br>condition: operators - <, >, >=, <=, =, !=<br>value: threshold value to be compared with the metric.<br>label: text that will be displayed when the condition is met.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| link         | URL link associated with the component.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| tooltip      | Tooltip settings<br>The parameters for configuring the tooltip include:<br><br>show: determines the visibility of the tooltip.<br>textAbove: text displayed above the component. Supports line breaks using "\n".<br>textBelow: text displayed below the component. Also supports line breaks using "\n".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| metrics      | Metrics configuration block                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| queries      | Unified metric identifiers<br>Replaces separate refIds/legends with a single queries parameter. Each query can specify either refid or legend along with other parameters.<br><br>Supported parameters:<br>- refid: adds a metric by refid from the query panel<br>- legend: adds a metric by legend from the query panel<br>- filter: filters labels using patterns/exclusions<br>- calculation: value calculation method (last/total/max/min/count/delta)<br>- label: custom display label<br>- sum: sum all values and display text<br>- unit: value formatting (seconds/bytes/percent etc)<br>- title: tooltip title text<br>- thresholds: threshold rules for coloring                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| baseColor    | Base color if thresholds are not met.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| decimal      | Decimal precision for metrics. Specifies the number of characters after the decimal point.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| displayText  | Text for displaying the component. Applies the displayed text in the tooltip for all metrics within the rule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| filling      | SVG element fill parameter<br>The filling parameter defines the fill of the SVG element and has the following format:<br>filling: 'fill, number'<br>where number is an optional parameter indicating the percentage of opacity. This can be useful for elements where it is necessary to color the metric and the background.<br><br>Supported parameters<br>none: no fill (may be necessary when using labelColor).<br>fill: fill color for the element.<br>stroke: fill for the element's stroke.<br>fs: combination of fill and stroke.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| thresholds   | Setting threshold values for changing metric colors.<br>In the rule, both bound thresholds for metrics and general thresholds can be set simultaneously. The priority of the threshold for the metric applies, and the base color is used if the parameter is absent in the metrics.<br><br>**Supported parameters**<br>color: threshold color.<br>value: value for the threshold.<br>operator: operator for comparing the threshold. Available operators: <, >, >=, <=, =, != (optional, default is >=).<br>lvl: threshold level. Sets the threshold level manually (by default, baseColor lvl = 0, each subsequent threshold +1).<br>condition: condition for evaluating the threshold. All parameters are optional and work separately.<br><br>**Condition**<br>**Time parameters**:<br>timezone: specifies the time zone.<br>hour, minute, day: allow setting time conditions for the threshold value.<br>**Metric comparison**:<br>The threshold can only trigger under a specific condition matching the metric. Application:<br>$refid.legend:calculationMethod > X: specifies the refid of the metric and its legend that needs to be compared (necessary when there are multiple labels for the metric).<br>$refid.legend > X: will default to setting calculation to last.<br>$refid > X: will automatically select the first legend from the refid array and set calculation to last. |

### Complete Configuration Example

```yaml
changes:
  - id: ['cell-status:basic:r@1', 'elem']
    attributes:
      autoConfig: true
      label: 'replace'
      labelColor: 'metric'
      valueMapping:
        - { condition: '>', value: 90, label: 'CRITICAL' }
        - { condition: '>', value: 70, label: 'WARNING' }
      link: '/dashboard/status'
      tooltip:
        show: true
        textAbove: 'System Status\n'
        textBelow: 'test'
    metrics:
      queries:
        - { refid: 'A', calculation: 'last', unit: 'percent' }
        - { legend: 'Load', filter: '*-test' }
      baseColor: '#CCCCCC'
      decimal: 1
      displayText: 'Current Load:'
      filling: 'fill,30'
      thresholds:
        - { color: 'green', value: 0 }
        - { color: 'orange', value: 70 }
        - { color: 'red', value: 90, condition: 'hour > 8 && hour < 20' }
```

Yaml Examples:

```yaml
#ID
changes:
  - id: 'id:text:r@1'
    attributes:

changes:
  - id: 'id'
    attributes:

changes:
  - id: 'tes*'
    attributes:

changes:
  - id: ['s1.*', 'cell-s2:basic:r@1|l@3']
    attributes:

# Metric m1 with a tabular schema that processes only refid 1
changes:
  - id: ['s1.*', 'cell-s2:basic:r@1|l@3']
    attributes:
```

```yaml
#autoConfig
changes:
  - id: ['texta2', 'cell-textb2']
    attributes:
      autoConfig: true
```

```yaml
#label
- id: 'textb'
  attributes:
    label: 'replace'

- id: 'textb'
  attributes:
    label: 'any text'
```

```yaml
#labelColor
- id: 'textb'
  attributes:
    labelColor: 'metric'

- id: 'textb'
  attributes:
    labelColor: 'red'
```

```yaml
#valueMapping
changes:
  - id: ['id:text']
    attributes:
      valueMapping:
        - { condition: '>=', value: 10, label: '5A;8 >= 10, < 20' }
        - { condition: '>=', value: 20, label: '5A;8 >= 20' }
      metrics:
        queries:
          - { refid: 'A' }
```

```yaml
#link
changes:
  - id: ['cell-id:text']
    attributes:
      link: '123.com'
```

```yaml
#tooltip
changes:
  - id: ['cell-id']
    attributes:
      tooltip:
        show: true
        textAbove: 'text\n ?5@5=>A'
        textBelow: 'text'
```

```yaml
#queries
metrics:
  - queries:
     - { refid: 'A', calculation: 'last', filter: '$date', label: 'text metric', unit: 'bytes', thresholds: *name }
     - { legend: 'A-series', unit: 'seconds' }
    baseColor: '#00ff00'

metrics:
  - queries:
    - { refid: 'A', thresholds: *name }
    - { refid: 'B' }
    baseColor: '#00ff00'

metrics:
  queries:
    - { refid: 'B' }
    - { legend: 'A-series' }
  baseColor: '#00ff00'

metrics:
  - queries:
    - { legend: 'A-series' }
    - { refid: '' }
    decimal: 0

metrics:
  - queries:
    - { refid: 'A', calculation: 'last', filter: '$date', label: 'text metric', unit: 'bytes', thresholds: *name }
    - { legend: 'A-series', filter: '-A-series' }
    baseColor: '#00ff00'
```

```yaml
# baseColor	decimal	displayText	filling
changes:
  - id: 'cell-id'
    attributes:
      metrics:
        - queries:
            - { refid: '' }
          baseColor: '#00ff00'
          decimal: 0
          displayText: 'your text'
          filling: 'fill, 20'
```

```yaml
#thresholds

#Standard application (for all metrics in the rule)
changes:
  - id: 'cell-id'
    attributes:
      metrics:
        queries:
         - { refid: 'A' }
        thresholds:
          - { color: 'orange', value: 10 }
          - { color: 'red', value: 20 }

#Example with a link
#Allows setting individual thresholds for each refid

thresholds:
  name: &name
  - { color: 'orange', value: 10, condition: 'timezone = 10, $B.B-series:last < 70 && $A > 10 && hour > 1' }
  - { color: 'red', value: 20 }

changes:
  - id: 'cell-id'
    attributes:
      metrics:
        - queries:
          - { refid: 'A', thresholds: *name }
```
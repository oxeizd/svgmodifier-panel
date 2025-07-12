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

##### Example YAML config: [https://github.com/oxeizd/svgmodifier-panel/blob/main/templates/cfg.yaml](https://github.com/oxeizd/svgmodifier-panel/blob/main/templates/cfg.yaml)

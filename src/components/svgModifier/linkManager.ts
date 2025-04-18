export class LinkManager {
  static addLinks(svgElementsMap: Map<string, SVGElement>, link: string) {
    for (const [, element] of svgElementsMap.entries()) {
      if (element) {
        this.wrapElementWithLink(element, link);
      }
    }
  }

  private static wrapElementWithLink(element: SVGElement, link: string) {
    const parent = element.parentNode;
    if (!parent) {
      return;
    }

    const addlink = document.createElementNS('http://www.w3.org/2000/svg', 'a');

    addlink.setAttribute('target', '_blank');
    addlink.setAttribute('href', link);

    parent.insertBefore(addlink, element);
    addlink.appendChild(element);
  }
}

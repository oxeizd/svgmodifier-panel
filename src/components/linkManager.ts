export class LinkManager {
  static addLinkToElement(element: SVGElement, link: string): void {
    const linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'a');
    linkElement.setAttribute('href', link);
    linkElement.setAttribute('target', '_blank');

    element.parentNode?.insertBefore(linkElement, element);
    linkElement.appendChild(element);
  }
}

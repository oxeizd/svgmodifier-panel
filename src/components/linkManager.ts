export class LinkManager {
  static addLinkToElement(element: SVGElement, link: string): void {
    const existingLinkElement = element.closest('a'); // Ищем ближайший родительский элемент <a>

    if (existingLinkElement) {
      // Если элемент уже находится внутри <a>, проверяем href
      if (existingLinkElement.getAttribute('href') === link) {
        return;
      } else {
        // Если <a> не существует, создаем новый
        const linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'a');
        linkElement.setAttribute('href', link);
        linkElement.setAttribute('target', '_blank');

        // Вставляем новый <a> перед элементом
        element.parentNode?.insertBefore(linkElement, element);
        linkElement.appendChild(element); // Перемещаем элемент внутрь нового <a>
      }
    }
  }
}

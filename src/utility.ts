/** HTML Utilities */

// Create a DOM element with given classes and optional text/id.
export function createElement(
  tag: keyof HTMLElementTagNameMap,
  classList: string[] = [],
  options: { text?: string; id?: string } = {}
): HTMLElement {
  const node = document.createElement(tag);
  classList.forEach((c) => node.classList.add(c));
  if (options.text) node.append(document.createTextNode(options.text));
  if (options.id) node.id = options.id;
  return node;
}

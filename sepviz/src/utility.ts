export function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** HTML Utilities */

// Create a DOM element with given classes and optional text/id.
export function createElement(
  tag: keyof HTMLElementTagNameMap,
  classList: string[] = [],
  options: { text?: string; id?: string } = {},
  children: HTMLElement[] = []
): HTMLElement {
  const node = document.createElement(tag);
  classList.forEach((c) => node.classList.add(c));
  if (options.text) node.append(document.createTextNode(options.text));
  if (options.id) node.id = options.id;
  children.forEach((child) => node.append(child));
  return node;
}

export function compareStr(n1: string, n2: string): number {
  if (n1 < n2) return -1;
  if (n1 > n2) return 1;
  return 0;
}

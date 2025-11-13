/** Configuration Utilities */

import yaml from 'js-yaml';

// See: https://github.com/magjac/d3-graphviz?tab=readme-ov-file#graphviz_keyMode
// Use 'keyMode: id' to ensure that d3-graphviz treats nodes or edges of the
// same id as the same object in transitions.
export const GraphvizOptions = {
  fit: false,
  zoom: true,
  keyMode: 'id',
  useWorker: false,
};

export const resetKeywords = [
  'Goal',
  'Lemma',
  'Theorem',
  'Definition',
  'Example',
  'Corollary',
  '-',
  '+',
  '*',
  '{',
  '}',
];

export const InTablePointerEdgeAttrs = {
  dir: 'both',
  arrowtail: 'dot',
  arrowhead: 'normal',
};

export type AttrKey = string | number;
export type AttrValue = string | number | boolean;
export type Attrs = Record<AttrKey, AttrValue>;

export interface RenderConfig {
  font?: FontConfig;
  graph?: Attrs;
  edge?: Attrs;
  node?: Attrs;
  constr?: Record<string, ConstrConfig>;
}

export interface FontConfig {
  name?: string;
  size?: number;
  charwidth?: number;
  existVarColor?: string;
}

export interface ConstrConfig {
  inPorts?: string[];
  isFlat?: boolean;
  args?: Record<number, ArgConfig>;
}

export interface ArgConfig {
  inTable?: boolean;
  isPointer?: boolean;
  inPorts?: string[];
  outPorts?: string[];
}

export interface CompleteArgConfig {
  inTable: boolean;
  isPointer: boolean;
  inPorts: string[];
  outPorts: string[];
}

export async function loadRenderConfig(
  url = 'renderConfig.yaml'
): Promise<RenderConfig> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const text = await response.text();
  return yaml.load(text) as RenderConfig;
}

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

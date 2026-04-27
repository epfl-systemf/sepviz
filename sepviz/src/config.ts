import yaml from 'js-yaml';
import merge from 'lodash.merge';

export const ResetKeywords = [
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

// TODO: make the following attrs adjustable by users
export const InTablePointerEdgeAttrs = {
  dir: 'both',
  arrowtail: 'dot',
  arrowhead: 'normal',
};
export const PointerNodeAttrs = {
  fontsize: '10',
  width: '0',
};
export const PointerEdgeAttrs = {
  tailclip: 'true',
  minlen: '1',
};

export type AttrKey = string | number;
export type AttrValue = string | number | boolean;
export type Attrs = Record<AttrKey, AttrValue>;

export interface RenderConfig {
  font: FontConfig;
  graph: Attrs;
  edge: Attrs;
  node: Attrs;
  hprop: HPropConfig; // TODO: add config to support new hprops
  constr: ConstrConfig;
  value: ValueConfig;
}

export type HPropConfig = Record<string, HPropEntryConfig>;
export type ConstrConfig = Record<string, ConstrEntryConfig>;
export type ValueConfig = Record<string, ValueEntryConfig>;

export interface HPropEntryConfig {
  argNum: number;
  pattern: string;
}

export interface ValueEntryConfig {
  label?: string;
  uid?: string;
}

export interface FontConfig {
  name: string;
  size: number;
  existVarColor: string;
}

export interface ConstrEntryConfig {
  /** The printed label. Default: use the entry key if unset. */
  label: string;
  /** Default: the input port for the first in-table arg, null if no arg is in table. */
  inPort: string | undefined;
  /** Default: false */
  drawBorder: boolean;
  args: ArgConfig;
}

export type ArgConfig = Record<number, ArgEntryConfig>;

export interface ArgEntryConfig {
  /** Default: true for flat structures, false otherwise */
  inTable: boolean;
  /**
   * When forceEdge is true, this argument is always treated as a pointer even
   * when the context does not imply it. For example, in `p ~> MListSeg L b`,
   * b is not a known pointer because b does not point to any object, but if
   * forceEdge=true, an edge to b will still be drawn.
   *
   * Default: false
   */
  forceEdge: boolean;
  /** Default: `in$i`, where i is the index of the argument */
  inPort: string;
  /** Default: `out$i`, where i is the index of the argument */
  outPort: string;
}

// NOTE: Use Courier 11 in graphviz and override display with Iosevka 12.
const defaultFontConfig = {
  name: 'Courier',
  size: 11,
  existVarColor: '#3465a4',
};

export function defaultRenderConfig(): RenderConfig {
  return {
    font: defaultFontConfig,
    graph: {
      rankdir: 'LR',
      ranksep: 0.05,
      nodesep: 0.05,
      concentrate: false,
      splines: true,
      packmode: 'array_i',
      truecolor: true,
      bgcolor: '#00000000',
      pad: 0,
      fontname: defaultFontConfig.name,
      fontsize: defaultFontConfig.size,
    },
    edge: {
      tailclip: false,
      arrowsize: 0.5,
      minlen: 3,
    },
    node: {
      shape: 'plaintext',
      margin: 0.05,
      fontname: defaultFontConfig.name,
      fontsize: defaultFontConfig.size,
    },
    hprop: {},
    constr: {},
    value: {},
  };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.text();
}

export async function loadRenderConfig(
  url = 'sepviz.yaml'
): Promise<RenderConfig> {
  const text = await fetchText(url);
  return readRenderConfig(text);
}

export function readRenderConfig(text: string): RenderConfig {
  const userRenderConfig = yaml.load(text) as Partial<RenderConfig>;
  const renderConfig: RenderConfig = merge(
    defaultRenderConfig(),
    userRenderConfig
  );
  renderConfig.constr = Object.fromEntries(
    Object.entries(renderConfig.constr).map(([key, config]) => [
      key,
      fillConstrEntryConfig(key, config),
    ])
  );
  return renderConfig;
}

export function defaultArgEntryConfig(
  idx: number,
  drawBorder: boolean = false
): ArgEntryConfig {
  return {
    inTable: drawBorder,
    forceEdge: false,
    inPort: `in$${idx}`,
    outPort: `out$${idx}`,
  };
}

/**
 * Fill a partial `ConstrEntryConfig` with default values.
 */
function fillConstrEntryConfig(
  key: string,
  c: Partial<ConstrEntryConfig>
): ConstrEntryConfig {
  const drawBorder = c?.drawBorder ?? false;
  const argNum = c?.args ? Math.max(...Object.keys(c.args).map(Number)) + 1 : 0;

  const args: ArgConfig = Object.fromEntries(
    Array.from({ length: argNum }, (_, i) => {
      const arg = c?.args?.[i];
      return [
        i,
        {
          inTable: arg?.inTable ?? drawBorder,
          forceEdge: arg?.forceEdge ?? false,
          inPort: arg?.inPort ?? `in$${i}`,
          outPort: arg?.outPort ?? `out$${i}`,
        },
      ];
    })
  );

  const inPort =
    Object.values(args).find((arg) => arg.inTable)?.inPort ?? `in$${0}`;

  return {
    label: c?.label ?? key,
    drawBorder,
    inPort,
    args,
  };
}

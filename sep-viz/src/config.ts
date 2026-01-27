// @ts:ignore
import yaml from 'js-yaml';

// @ts:ignore
import merge from 'lodash.merge';

// See: https://github.com/magjac/d3-graphviz?tab=readme-ov-file#graphviz_keyMode
// Use 'keyMode: id' to ensure that d3-graphviz treats nodes or edges of the
// same id as the same object in transitions.
export const GraphvizOptions = {
  fit: false,
  zoom: true,
  keyMode: 'id',
  useWorker: false,
};

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

export const InTablePointerEdgeAttrs = {
  dir: 'both',
  arrowtail: 'dot',
  arrowhead: 'normal',
};

export type AttrKey = string | number;
export type AttrValue = string | number | boolean;
export type Attrs = Record<AttrKey, AttrValue>;

export interface RenderConfig {
  font: FontConfig;
  graph: Attrs;
  edge: Attrs;
  node: Attrs;
  constr: Record<string, ConstrConfig>;
}

export interface FontConfig {
  name: string;
  size: number;
  existVarColor: string;
}

export interface ConstrConfig {
  inPort: string | null; // default: the input port for the first in-table arg, null if no arg is in table.
  drawBorder: boolean; // default: false
  argNum: number; // default: the maximum key of args, 0 if args is null.
  args: Record<number, ArgConfig>;
}

export interface ArgConfig {
  inTable: boolean; // default: true for flat structures, false otherwise
  forceEdge: boolean; // default: false.
  // When forceEdge is true, this argument is always treated as a pointer even
  // when the context does not imply it. For example, {* p ~> MListSeg L b *}
  // b is not a known pointer because b does not point to any object, but if
  // forceEdge=true, an edge to b will still be drawn.
  inPort: string; // default: `in$i`, where i is the index of the argument
  outPort: string; // default: `out$i`, where i is the index of the argument
}

// NOTE: Use Courier 11 in graphviz and override display with Iosevka 12.
const defaultFontConfig = {
  name: 'Courier',
  size: 11,
  existVarColor: '#3465a4',
};

const defaultRenderConfig = {
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
  constr: {},
};

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.text();
}

export async function loadRenderConfig(
  url = 'renderConfig.yaml'
): Promise<RenderConfig> {
  const text = await fetchText(url);
  const userRenderConfig = (await yaml.load(text)) as Partial<RenderConfig>;
  const renderConfig: RenderConfig = merge(
    defaultRenderConfig,
    userRenderConfig
  );
  // Complete constr configs with default values.
  Object.entries(renderConfig.constr).forEach(([name, c]) => {
    const argNum =
      c?.argNum ??
      (c?.args ? Math.max(...Object.keys(c?.args).map(Number)) + 1 : 0);

    let drawBorder = c?.drawBorder ?? false;
    let inPort = null;

    const args: Record<number, ArgConfig> = {};
    for (let i = 0; i < argNum; i++) {
      args[i] = {
        inTable: c?.args?.[i]?.inTable ?? (drawBorder ? true : false),
        forceEdge: c?.args?.[i]?.forceEdge ?? false,
        inPort: c?.args?.[i]?.inPort ?? `in$${i}`,
        outPort: c?.args?.[i]?.outPort ?? `out$${i}`,
      };
      if (!inPort && args[i].inTable) inPort = args[i].inPort;
    }

    renderConfig.constr[name] = {
      drawBorder: drawBorder,
      inPort: inPort,
      argNum: argNum,
      args: args,
    };
  });

  return renderConfig;
}

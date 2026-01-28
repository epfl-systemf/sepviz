/**
 * Core logic for turning separation-logic formulas into Graphviz DOT
 * visualizations. Provides:
 * - `parse`: parses a goal text into a heap state if it's a formula;
 * - `DotBuilder`: given a heap state, constructs the DOT representation.
 */

// @ts-ignore
import { parse as peggyParse } from './parser';

import {
  Attrs,
  AttrKey,
  AttrValue,
  ArgConfig,
  ConstrConfig,
  RenderConfig,
  InTablePointerEdgeAttrs,
} from './config';

import { sort } from './sort';

type Uid = string;

export interface Symbol {
  isGlobal: boolean;
  uid: Uid;
  label: string;
  // config: ArgConfig;
}

export type PurePredicate = (Symbol | string)[];

export interface HeapPredicate {
  addr: Symbol;
  obj: HeapObject;
}

export interface HeapObject {
  addr: Symbol;
  constr: string;
  args: Symbol[];
  config: ConstrConfig;
  hyp: string;
}

export interface HeapState {
  position: string;
  raw: string;
  pred: StarHeapPred;
}

export enum OtherHeapPredKind {
  Wand,
  Conj,
  Disj,
  Modality,
  Abstract,
}

export interface StarHeapPred {
  heapObjs: HeapObject[];
  purePreds: PurePredicate[];
  otherHeapPreds: OtherHeapPred[];
}

export interface OtherHeapPred {
  kind: OtherHeapPredKind;
  preds: StarHeapPred[];
  op: string;
}

export function parse(
  goalText: string,
  renderConfig: RenderConfig
): (HeapState | string)[] {
  return peggyParse(goalText).map((unit: any) =>
    typeof unit === 'object'
      ? resolveSymbols(unit, renderConfig)
      : (unit as string)
  );
}

function newStarHeapPred(): StarHeapPred {
  return { heapObjs: [], purePreds: [], otherHeapPreds: [] };
}

function resolveSymbols(unit: any, renderConfig: RenderConfig): HeapState {
  let pred: StarHeapPred = newStarHeapPred();
  let gensym: Record<string, number> = {};

  function getConstrConfig(constrName: string): ConstrConfig {
    const config = renderConfig.constr?.[constrName];
    if (!config) throw new Error(`Missing config for constr ${constrName}.`);
    return config;
  }

  function next(prefix: string): number {
    if (!(prefix in gensym)) gensym[prefix] = 0;
    return gensym[prefix]++;
  }

  function resolve(ctx: Record<string, Symbol>, key: string): Symbol {
    return key in ctx ? ctx[key] : { isGlobal: true, uid: key, label: key };
  }

  function loop(
    sep: any,
    ctx: Record<string, Symbol>,
    pred: StarHeapPred,
    binder: string
  ) {
    switch (sep.kind) {
      case 'stars':
        sep.conjuncts.forEach((c: any) => loop(c, ctx, pred, binder));
        break;
      case 'existential':
        const num = next(sep.binder);
        ctx[sep.binder] = {
          isGlobal: false,
          uid: sep.binder + '$' + num,
          label: `?${sep.binder}${num}`, // ['font', {}, `?${sep.binder}`, ['sub', {}, `${num}`]]
        };
        loop(sep.body, ctx, pred, binder);
        break;
      case 'pointsTo':
        const [constr, ...args] = sep.to as string[];
        pred.heapObjs.push({
          addr: resolve(ctx, sep.from),
          constr: constr,
          args: args.map((arg) => resolve(ctx, arg)),
          config: getConstrConfig(constr),
          hyp: binder,
        });
        break;
      case 'wand':
        const H1 = newStarHeapPred(),
          H2 = newStarHeapPred();
        const wand: OtherHeapPred = {
          kind: OtherHeapPredKind.Wand,
          preds: [H1, H2],
          op: '-∗',
        };
        loop(sep.H1, ctx, H1, binder);
        loop(sep.H2, ctx, H2, binder);
        pred.otherHeapPreds.push(wand);
        break;
      case 'gc':
        break;
      case 'purePredicate':
        pred.purePreds.push(
          sep.predicate.map((x: string) => (x in ctx ? ctx[x] : x))
        );
        break;
      case 'modality':
        const H = newStarHeapPred();
        const m: OtherHeapPred = {
          kind: OtherHeapPredKind.Modality,
          preds: [H],
          op: sep.op,
        };
        loop(sep.body, ctx, H, binder);
        pred.otherHeapPreds.push(m);
        break;
      case 'abstract': // FIXME
        pred.otherHeapPreds.push({
          kind: OtherHeapPredKind.Abstract,
          preds: [],
          op: sep.body,
        });
        break;
      default:
        throw new Error(`Not supported kind: ${sep.kind}`);
    }
  }

  if (unit.kind === 'top') loop(unit.parsed, {}, pred, '');
  else if (unit.kind === 'namedtops') {
    const ctx = {};
    unit.tops.forEach((top: any) =>
      loop(top.top.parsed, ctx, pred, top.binder)
    );
  }

  return { position: unit.position, raw: unit.raw, pred: pred };
}

type XMLChild = XMLElement | string;

class XMLContainer {
  readonly children: XMLChild[];

  constructor(...children: XMLChild[]) {
    this.children = children;
  }
}

class XMLElement extends XMLContainer {
  readonly tag: string;
  readonly attrs: Attrs;

  constructor(tag: string, attrs: Attrs = {}, ...children: XMLChild[]) {
    super(...children);
    this.tag = tag;
    this.attrs = attrs;
  }
}

type NodeAttrValue = XMLElement | AttrValue;
type NodeAttrs = Record<AttrKey, NodeAttrValue>;

class DotNode {
  public readonly attrs: Record<string, NodeAttrValue>;
  constructor(
    public readonly uid: Uid,
    label: XMLElement | string,
    otherAttrs: NodeAttrs = {}
  ) {
    this.uid = uid;
    this.attrs = { id: uid, label: label, ...otherAttrs };
  }
}

class DotEdge {
  constructor(
    public readonly srcUid: Uid,
    public readonly srcOutPorts: string[],
    public readonly dstUid: Uid,
    public readonly dstInPorts: string[],
    public readonly attrs: Attrs = {}
  ) {
    this.srcUid = srcUid;
    this.srcOutPorts = srcOutPorts;
    this.dstUid = dstUid;
    this.dstInPorts = dstInPorts;
    /**
     * In graphviz, an edge is identified by its end points (ignoring middle
     * ports). For example, edge "p1":"car_out":"c" -> "f1":"car_in":"w" has
     * auto-generated title "p1:c->f1:w". By default, d3-graphviz uses these
     * titles to identify nodes and edges.
     * d3-graphviz allows users to set the key mode to "id" to use user-defined
     * or auto-generated id for identification. Here, we generated the id using
     * only `src`, so that when src -> dst0 gets animated to src -> dst1, d3
     * will make the edge point to dst1 instead of fading out old edge and
     * fading in the new one.
     */
    this.attrs = { id: `${srcUid}-${srcOutPorts.join('-')}`, ...attrs };
  }

  toString(): string {
    return [
      this.srcUid,
      ...this.srcOutPorts,
      this.dstUid,
      ...this.dstInPorts,
    ].join('-');
  }
}

class DotTarget {
  constructor(
    public readonly name: 'graph' | 'node' | 'edge',
    public readonly attrs: Attrs = {}
  ) {
    this.name = name;
    this.attrs = attrs;
  }
}

interface DotCluster {
  root: Uid;
  nodes: DotNode[];
  edges: DotEdge[];
}

export type NodeOrder = Record<Uid, number>;

// TODO: rename RenderConfig to DotConfig ?
export class DotBuilder {
  private readonly config: RenderConfig;
  private readonly heapObjs: HeapObject[];
  private readonly knownPtrUids: Set<Uid>;
  private readonly inPortOfUid: Record<Uid, string | null>;
  private readonly previousOrder: NodeOrder | null;
  public readonly dot: string;
  public readonly nodeOrder: NodeOrder;

  constructor(
    config: RenderConfig,
    heapObjs: HeapObject[],
    previousOrder: NodeOrder | null
  ) {
    this.config = config;
    this.heapObjs = heapObjs;
    // this.heapObjs.forEach((obj) => {
    //   // below does not work because some args are aliased between heap objs with
    //   // different constrs. specifically, existential args are unique across
    //   // heap objs, and this would reset .config once for each of them
    //   // obj.args.forEach((arg, idx) => {
    //   //   arg.config = obj.config.args[idx];
    //   // });
    // });
    this.knownPtrUids = new Set(heapObjs.map((obj) => obj.addr.uid));
    this.inPortOfUid = Object.fromEntries(
      heapObjs.map((obj) => [obj.addr.uid, obj.config.inPort ?? null])
    ) as Record<Uid, string | null>;
    this.previousOrder = previousOrder;

    const [clusters, targets] = this.buildComponents();
    this.nodeOrder = this.buildNodeOrder(clusters);
    this.dot = this.buildText(clusters, targets);
  }

  protected buildComponents(): [DotCluster[], DotTarget[]] {
    const nodes: DotNode[] = this.heapObjs.map(
      (obj) =>
        new DotNode(obj.addr.uid, this.buildNodeLabel(obj), {
          tooltip: obj.hyp,
        })
    );
    const edges: DotEdge[] = this.heapObjs.flatMap((obj) =>
      this.buildEdges(obj)
    );

    // For each root pointer, add a node for the pointer and a edge from the
    // pointer to the pointed-to object.
    let hasIncomingEdges: Record<Uid, boolean> = {};
    edges.forEach((edge) => (hasIncomingEdges[edge.dstUid] = true));
    this.heapObjs
      .filter((obj) => obj.addr.isGlobal && !hasIncomingEdges[obj.addr.uid])
      .forEach((obj) => {
        const [node, edge] = this.buildRootPointerNodeAndEdge(obj.addr);
        nodes.push(node);
        edges.push(edge);
      });

    // Add missing target nodes.
    edges.forEach((edge) => {
      const uid = edge.dstUid;
      if (!this.knownPtrUids.has(uid))
        nodes.push(new DotNode(uid, uid, { width: '0' }));
    });

    const targets = [
      new DotTarget('graph', this.config.graph),
      new DotTarget('node', this.config.node),
      new DotTarget('edge', this.config.edge),
    ];

    const clusters = this.partition(nodes, edges);
    clusters
      .sort((c1, c2) => c2.root.localeCompare(c1.root))
      .map((c) => this.sortNodes(c));

    return [clusters, targets];
  }

  protected buildNodeOrder(clusters: DotCluster[]): NodeOrder {
    const nodeOrder: NodeOrder = {};
    clusters
      .flatMap((cluster) => cluster.nodes.flatMap((n) => n.uid))
      .forEach((uid, idx) => (nodeOrder[uid] = idx));
    return nodeOrder;
  }

  // Run a union-find to cluster the graph into weakly connected components.
  protected partition(nodes: DotNode[], edges: DotEdge[]): DotCluster[] {
    let parents: Record<Uid, Uid> = {};
    nodes.forEach((n) => (parents[n.uid] = n.uid));

    function find(uid: Uid): Uid {
      let parent = parents[uid];
      return uid == parent ? parent : (parents[uid] = find(parent));
    }

    function union(src: Uid, dst: Uid): void {
      // LATER: Add a size heuristic if this is too slow
      parents[find(dst)] = find(src);
    }

    // Sort the edges before union find to make sure equivalent states that
    // contain circles ends up having the same roots.
    // Example: {* p ~> MCell q null \* q ~> MCell p null *}
    //   and {* q ~> MCell p null \* p ~> MCell q null *}
    //   should end up with the same cluster with root 'p'.
    edges.sort((e1, e2) => e1.toString().localeCompare(e2.toString()));
    edges.forEach((edge) => union(edge.srcUid, edge.dstUid));

    const clusters: Record<Uid, DotCluster> = {};
    Object.keys(parents).forEach((uid: Uid) => {
      const root = find(uid);
      if (!(root in clusters))
        clusters[root] = { root: root, nodes: [], edges: [] };
    });
    nodes.forEach((n) => clusters[find(n.uid)].nodes.push(n));
    edges.forEach((e) => clusters[find(e.srcUid)].edges.push(e));

    return Object.values(clusters);
  }

  protected sortNodes(cluster: DotCluster): DotCluster {
    const order = sort(
      cluster.root,
      cluster.nodes.map((n) => n.uid),
      cluster.edges.map((e) => {
        return { src: e.srcUid, dst: e.dstUid };
      }),
      this.previousOrder
    );
    cluster.nodes.sort((n1, n2) => order[n1.uid] - order[n2.uid]);
    return cluster;
  }

  protected buildText(clusters: DotCluster[], targets: DotTarget[]): string {
    const renderXMLAttr = (k: AttrKey, v: AttrValue) =>
      v === null ? '' : ` ${k}="${v}"`;

    const renderXMLAttrs = (attrs: Attrs) =>
      Object.entries(attrs)
        .map(([k, v]) => renderXMLAttr(k, v))
        .join('');

    function renderXML(xml: XMLChild): string {
      if (xml instanceof XMLElement) {
        return [
          `<${xml.tag}${renderXMLAttrs(xml.attrs)}>`,
          ...xml.children.map(renderXML),
          `</${xml.tag}>`,
        ].join('');
      } else if (xml instanceof XMLContainer) {
        return xml.children.map(renderXML).join('');
      } else {
        return xml;
      }
    }

    function renderAttr(k: AttrKey, v: AttrValue | NodeAttrValue): string {
      const sv = v instanceof XMLElement ? `<${renderXML(v)}>` : `"${v}"`;
      return v === null ? '' : `${k}=${sv}`;
    }

    function renderAttrs(attrs: Attrs | NodeAttrs): string {
      const s = Object.entries(attrs)
        .map(([k, v]) => renderAttr(k, v))
        .join(', ');
      return s === '' ? '' : `[${s}]`;
    }

    const renderNode = (node: DotNode) =>
      `"${node.uid}" ${renderAttrs(node.attrs)}`;

    const renderExtremity = (uid: Uid, ports: string[]) =>
      [uid, ...ports].map((a) => `"${a}"`).join(':');

    const renderEdge = (edge: DotEdge) => {
      const src = renderExtremity(edge.srcUid, edge.srcOutPorts);
      const dst = renderExtremity(edge.dstUid, edge.dstInPorts);
      return `${src} -> ${dst} ${renderAttrs(edge.attrs)}`;
    };

    const renderTarget = (target: DotTarget) => {
      return `${target.name} ${renderAttrs(target.attrs)}`;
    };

    const clusterTexts: string[] = clusters.map((c) =>
      [...c.nodes.map(renderNode), ...c.edges.map(renderEdge)].join('\n')
    );

    return [
      'digraph {',
      ...targets.map(renderTarget),
      ...clusterTexts,
      '}',
    ].join('\n');
  }

  protected buildNodeLabel(heapObj: HeapObject): XMLElement {
    const xml =
      (tag: string, defaultAttrs: Attrs = {}) =>
      (attrs: Attrs = {}, ...children: XMLChild[]) =>
        new XMLElement(tag, { ...defaultAttrs, ...attrs }, ...children);

    const table = xml('table', {
        border: 0,
        cellborder: 1,
        cellspacing: 0,
        cellpadding: 2,
      }),
      box = xml('table', {
        border: 0,
        cellborder: 0,
        cellspacing: 0,
        cellpadding: 0,
      }),
      tr = xml('tr'),
      td = xml('td'),
      font = xml('font'),
      b = xml('b');

    const row = (...vs: XMLChild[]) => tr({}, ...vs.map((v) => td({}, v)));

    const globalLabel: (label: string) => XMLElement | string = (label) =>
      label == 'null' ? font({ face: 'Helvetica' }, '∅') : label;

    const localLabel: (label: string) => XMLElement = (label) => {
      const color = this.config.font.existVarColor;
      return font({ color: color }, label);
    };

    const label: (sym: Symbol) => XMLChild = (sym) =>
      sym.isGlobal ? globalLabel(sym.label) : localLabel(sym.label);

    const header: XMLElement = tr(
      {},
      td(
        { colspan: 2, cellpadding: 0, sides: 'b' },
        box({}, row(label(heapObj.addr), ': ', heapObj.constr))
      )
    );

    /** See: https://github.com/magjac/d3-graphviz#maintaining-object-constancy
     * To keep Graphviz’s auto-generated tag indices stable (for smooth
     * transitions), value fields and pointer fields must have the same table
     * shape.
     */
    function constrField(
      port0: string,
      s0: XMLChild,
      port1: string | null,
      s1: string
    ): XMLElement {
      return tr(
        {},
        td({ port: port0, sides: 'tlb' }, s0),
        td(port1 ? { port: port1, sides: 'trb' } : { sides: 'trb' }, s1)
      );
    }

    const value = (port: string, sym: Symbol) =>
      constrField(port, label(sym), null, '');

    const pointer = (inPort: string, outPort: string, sym: Symbol) =>
      // Or: use '⏺' here and disable InTablePointerEdgeAttr
      constrField(inPort, label(sym), outPort, '');

    function getArgConfig(
      arg: Symbol,
      idx: number
    ): [arg: Symbol, config: ArgConfig] {
      return [arg, heapObj.config.args[idx]];
    }

    return table(
      { cellborder: heapObj.config.drawBorder ? 1 : 0 },
      header,
      ...heapObj.args
        .map(getArgConfig)
        .filter(([, config]) => config.inTable)
        .map(([arg, config]) =>
          this.knownPtrUids.has(arg.uid) || config.forceEdge
            ? pointer(config.inPort, config.outPort, arg)
            : value(config.inPort, arg)
        )
    );
  }

  protected buildEdges(heapObj: HeapObject): DotEdge[] {
    const srcUid = heapObj.addr.uid;
    const allEdges = heapObj.args.flatMap((arg, idx) => {
      const config = heapObj.config.args[idx];
      if (!(this.knownPtrUids.has(arg.uid) || config.forceEdge)) return [];
      const srcOutPorts = [config.outPort, config.inTable ? 'c' : 'e'];
      const dstUid = arg.uid;
      const dstInPorts = this.inPortOfUid[dstUid]
        ? [this.inPortOfUid[dstUid], 'w']
        : ['w'];
      const edge = new DotEdge(
        srcUid,
        srcOutPorts,
        dstUid,
        dstInPorts,
        config.inTable ? InTablePointerEdgeAttrs : {}
      );
      if (srcOutPorts.length == 1 && dstInPorts.length == 1) return [edge];
      // If `edge` starts or ends inside a table, add an invisible node-level
      // edge to reduce edge crossing.
      const nodeLevelEdge = new DotEdge(srcUid, ['e'], dstUid, ['w'], {
        style: 'invis',
        constraint: false,
      });
      return [edge, nodeLevelEdge];
    });

    // The node-level edges might have duplicates.
    const seen = new Set<string>();
    const uniqueEdges = allEdges.filter((e) => {
      if (e.srcOutPorts.length > 1 || e.dstInPorts.length > 1) return true;
      const key = `${e.srcUid}-${e.dstUid}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return uniqueEdges;
  }

  protected buildRootPointerNodeAndEdge(sym: Symbol): [DotNode, DotEdge] {
    // `sym.uid` is the name of the Dot node representing the pointed-to object.
    const ptrUid = sym.uid + '$ptr';
    const node = new DotNode(ptrUid, sym.label, {
      fontsize: '10',
      width: '0',
    });
    const edge = new DotEdge(
      ptrUid,
      ['e'],
      sym.uid,
      (this.inPortOfUid[sym.uid]
        ? [this.inPortOfUid[sym.uid], 'nw']
        : ['nw']) as string[],
      { tailclip: 'true', minlen: '1' }
    );
    return [node, edge];
  }
}

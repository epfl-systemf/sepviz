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
  ConstrConfig,
  CompleteArgConfig,
  RenderConfig,
  InTablePointerEdgeAttrs,
} from './utility';

type Uid = string;

export interface Symbol {
  isGlobal: boolean;
  uid: Uid;
  label: string;
}

export type PurePredicate = (Symbol | string)[];

export interface HeapPredicate {
  addr: Symbol;
  obj: HeapObject;
}

export interface HeapObject {
  constr: string;
  args: Symbol[];
}

export interface HeapState {
  position: string;
  raw: string;
  heapPredicates: HeapPredicate[];
  purePredicates: PurePredicate[];
}

export function parse(goalText: string): (HeapState | string)[] {
  return peggyParse(goalText).map((unit: any) =>
    typeof unit === 'object' ? resolveSymbols(unit) : (unit as string)
  );
}

function resolveSymbols(unit: any): HeapState {
  let purePredicates: PurePredicate[] = [];
  let heapPredicates: HeapPredicate[] = [];
  let gensym: Record<string, number> = {};

  function next(prefix: string): number {
    if (!(prefix in gensym)) gensym[prefix] = 0;
    return gensym[prefix]++;
  }

  function resolve(ctx: Record<string, Symbol>, key: string): Symbol {
    return key in ctx ? ctx[key] : { isGlobal: true, uid: key, label: key };
  }

  function loop(sep: any, ctx: Record<string, Symbol>) {
    switch (sep.kind) {
      case 'stars':
        sep.conjuncts.forEach((c: any) => loop(c, ctx));
        break;
      case 'existential':
        const num = next(sep.binder);
        ctx[sep.binder] = {
          isGlobal: false,
          uid: sep.binder + '$' + num,
          label: `?${sep.binder}${num}`, // ['font', {}, `?${sep.binder}`, ['sub', {}, `${num}`]]
        };
        loop(sep.body, ctx);
        break;
      case 'pointsTo':
        const [constr, ...args] = sep.to as string[];
        heapPredicates.push({
          addr: resolve(ctx, sep.from),
          obj: {
            constr: constr,
            args: args.map((arg) => resolve(ctx, arg)),
          },
        });
        break;
      case 'gc':
        break;
      case 'purePredicate':
        purePredicates.push(
          sep.predicate.map((x: string) => (x in ctx ? ctx[x] : x))
        );
        break;
      default:
        throw new Error('Not supported kind: ${sep.kind}');
    }
  }

  loop(unit.parsed, {});

  return {
    position: unit.position,
    raw: unit.raw,
    heapPredicates: heapPredicates,
    purePredicates: purePredicates,
  };
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
    public readonly srcOurPorts: string[],
    public readonly dstUid: Uid,
    public readonly dstInPorts: string[],
    public readonly attrs: Attrs = {}
  ) {
    this.srcUid = srcUid;
    this.srcOurPorts = srcOurPorts;
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
    this.attrs = { id: `${srcUid}-${srcOurPorts.join('-')}`, ...attrs };
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

// TODO: rename RenderConfig to DotConfig ?
export class DotBuilder {
  private readonly config: RenderConfig;
  private readonly heapPredicates: HeapPredicate[];
  private readonly knownPtrUids: Set<Uid>;
  private readonly inPortsOfUid: Record<Uid, string[]>;

  constructor(config: RenderConfig, heapPredicates: HeapPredicate[]) {
    this.config = config;
    this.heapPredicates = heapPredicates;
    this.knownPtrUids = new Set(heapPredicates.map((hpred) => hpred.addr.uid));
    this.inPortsOfUid = Object.fromEntries(
      heapPredicates.map((hpred) => [
        hpred.addr.uid,
        this.config?.constr?.[hpred.obj.constr].inPorts ?? [],
      ])
    ) as Record<Uid, string[]>;
  }

  build(): string {
    return this.buildText(...this.buildComponents());
  }

  protected buildComponents(): [DotCluster[], DotTarget[]] {
    const nodes: DotNode[] = this.heapPredicates.map(
      (hpred) => new DotNode(hpred.addr.uid, this.buildNodeLabel(hpred))
    );
    const edges: DotEdge[] = this.heapPredicates.flatMap((hpred) =>
      this.buildEdges(hpred)
    );

    // For each root pointer, add a node for the pointer and a edge from the
    // pointer to the pointed-to object.
    let hasIncomingEdges: Record<Uid, boolean> = {};
    edges.forEach((edge) => (hasIncomingEdges[edge.dstUid] = true));
    this.heapPredicates
      .filter(
        (hpred) => hpred.addr.isGlobal && !hasIncomingEdges[hpred.addr.uid]
      )
      .forEach((hpred) => {
        const [node, edge] = this.buildRootPointerNodeAndEdge(hpred.addr);
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
    return [clusters, targets];
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

    edges.forEach((edge) => union(edge.srcUid, edge.dstUid));

    const clusters: Record<Uid, DotCluster> = {};
    Object.keys(parents).forEach((uid: Uid) => {
      const root = find(uid);
      if (!(root in clusters))
        clusters[root] = { root: root, nodes: [], edges: [] };
    });
    nodes.forEach((n) => clusters[find(n.uid)].nodes.push(n));
    edges.forEach((e) => clusters[find(e.srcUid)].edges.push(e));

    return Object.values(clusters)
      .sort((c1, c2) => c2.root.localeCompare(c1.root))
      .map((c) => this.sortInsideCluster(c));
  }

  protected sortInsideCluster(cluster: DotCluster): DotCluster {
    cluster.nodes.sort((n1, n2) => n1.uid.localeCompare(n2.uid));
    const edgeToString = (e: DotEdge) =>
      [e.srcUid, ...e.srcOurPorts, e.dstUid, ...e.dstInPorts].join();
    cluster.edges.sort((e1, e2) =>
      edgeToString(e1).localeCompare(edgeToString(e2))
    );
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
      const src = renderExtremity(edge.srcUid, edge.srcOurPorts);
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

  protected getConstrConfig(constrName: string): ConstrConfig {
    const config = this.config.constr?.[constrName];
    if (!config) {
      throw new Error(`Configuration for constr ${constrName} is missing.`);
    }
    return config;
  }

  protected getCompleteArgConfig(
    constrConfig: ConstrConfig,
    argIdx: number
  ): CompleteArgConfig {
    const argConfig = constrConfig.args?.[argIdx];
    return {
      inTable: argConfig?.inTable ?? false,
      isPointer: argConfig?.isPointer ?? false,
      inPorts: argConfig?.inPorts ?? [`default_in_${argIdx}`],
      outPorts: argConfig?.outPorts ?? [`default_out_${argIdx}`],
    };
  }

  protected buildNodeLabel(hpred: HeapPredicate): XMLElement {
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

    // TODO: read default value from default config
    const localLabel: (label: string) => XMLElement = (label) => {
      const color = this.config.font?.existVarColor ?? '#3465a4';
      return font({ color: color }, label);
    };

    const label: (sym: Symbol) => XMLChild = (sym) =>
      sym.isGlobal ? globalLabel(sym.label) : localLabel(sym.label);

    const header: XMLElement = tr(
      {},
      td(
        { colspan: 2, cellpadding: 0, sides: 'b' },
        box({}, row(label(hpred.addr), ': ', hpred.obj.constr))
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

    const constrConfig = this.getConstrConfig(hpred.obj.constr);
    return table(
      { cellborder: constrConfig.isFlat ? 1 : 0 },
      header,
      ...hpred.obj.args.flatMap((arg, idx) => {
        const config = this.getCompleteArgConfig(constrConfig, idx);
        if (!config.inTable) return [];
        return [
          this.knownPtrUids.has(arg.uid) || config.isPointer
            ? pointer(config.inPorts[0], config.outPorts[0], arg)
            : value(config.inPorts[0], arg),
        ];
      })
    );
  }

  protected buildEdges(hpred: HeapPredicate): DotEdge[] {
    const srcUid = hpred.addr.uid;
    const constrConfig = this.getConstrConfig(hpred.obj.constr);
    return hpred.obj.args.flatMap((arg, idx) => {
      const config = this.getCompleteArgConfig(constrConfig, idx);
      if (!(this.knownPtrUids.has(arg.uid) || config.isPointer)) return [];
      const srcOutPorts = [...config.outPorts, config.inTable ? 'c' : 'e'];
      const dstUid = arg.uid;
      const dstInPort = [...(this.inPortsOfUid[dstUid] || []), 'w'];
      return [
        new DotEdge(
          srcUid,
          srcOutPorts,
          dstUid,
          dstInPort,
          config.inTable ? InTablePointerEdgeAttrs : {}
        ),
      ];
    });
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
      [...this.inPortsOfUid[sym.uid], 'nw'],
      { tailclip: 'true', minlen: '1' }
    );
    return [node, edge];
  }
}

import * as AST from './parser';
import {
  Attrs,
  AttrKey,
  AttrValue,
  ArgEntryConfig,
  RenderConfig,
  InTablePointerEdgeAttrs,
} from './config';
import { assert } from './utility';

// -- XML ----------------------------------------------------------------------

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

// -- Dot Builder --------------------------------------------------------------

type NodeAttrValue = XMLElement | AttrValue;
type NodeAttrs = Record<AttrKey, NodeAttrValue>;

interface DotNode {
  uid: string;
  label: XMLElement | string;
  attrs: NodeAttrs;
}
interface DotEdge {
  srcUid: string;
  srcOutPorts: string[];
  dstUid: string;
  dstInPorts: string[];
  attrs: Attrs;
}
interface DotCluster {
  root: string;
  nodes: DotNode[];
  edges: DotEdge[];
}
interface DotTarget {
  name: 'graph' | 'node' | 'edge';
  attrs: Attrs;
}

export class DotBuilder {
  public readonly dot: string;
  private readonly nodeUids: Set<string>;
  private readonly inPortOfUid: Record<string, string | null>;

  /** @internal: Exposed for testing. */
  public readonly clusters: DotCluster[];

  constructor(
    private readonly config: RenderConfig,
    public readonly pts: AST.HProp_PointsTo[]
  ) {
    // check config
    pts.forEach((pt) => {
      assert(
        pt.repr in config.constr,
        `config for constr ${pt.repr} not found`
      );
      pt.config = config.constr[pt.repr];
    });
    this.nodeUids = new Set(pts.map((pt) => pt.locUid()));
    this.inPortOfUid = Object.fromEntries(
      pts.map((pt) => [pt.locUid(), config.constr[pt.repr].inPort])
    );
    const [clusters, targets] = this.buildComponents();
    this.clusters = clusters;
    this.dot = this.buildText(clusters, targets);
  }

  protected buildComponents(): [DotCluster[], DotTarget[]] {
    const nodes: DotNode[] = this.pts.map((pt) => {
      return {
        uid: pt.locUid(),
        label: this.buildNodeLabel(pt),
        attrs:
          pt.binder !== undefined ? { tooltip: pt.binder } : ({} as NodeAttrs), // FIXME: tooltip
      };
    });
    const edges: DotEdge[] = this.pts.flatMap((pt) => this.buildEdges(pt));

    // For each root pointer, add a node for the pointer and a edge from the
    // pointer to the pointed-to object.
    let hasIncomingEdges: Record<string, boolean> = {};
    edges.forEach((e) => (hasIncomingEdges[e.dstUid] = true));
    this.pts
      .filter((pt) => pt.locIsGlobal() && !hasIncomingEdges[pt.locUid()])
      .forEach((pt) => {
        const [node, edge] = this.buildRootPointerNodeEdge(
          pt.locUid(),
          pt.locLabel()
        );
        nodes.push(node);
        edges.push(edge);
      });

    // Add missing dst nodes.
    edges.forEach((edge) => {
      const u = edge.dstUid;
      if (!this.nodeUids.has(u)) {
        nodes.push({ uid: u, label: u, attrs: { width: '0' } });
        this.nodeUids.add(u);
      }
    });

    const clusters = this.partition(nodes, edges);
    clusters.sort((c1, c2) => c2.root.localeCompare(c1.root)); // TODO: sort nodes?

    const targets: DotTarget[] = [
      { name: 'graph', attrs: this.config.graph },
      { name: 'node', attrs: this.config.node },
      { name: 'edge', attrs: this.config.edge },
    ];

    return [clusters, targets];
  }

  /**
   * Run a union-find to cluster the graph into weakly connected components.
   */
  protected partition(nodes: DotNode[], edges: DotEdge[]): DotCluster[] {
    const parents: Record<string, string> = {};
    nodes.forEach((n) => (parents[n.uid] = n.uid));

    function find(uid: string): string {
      let parent = parents[uid];
      return uid == parent ? parent : (parents[uid] = find(parent));
    }

    function union(src: string, dst: string): void {
      // TODO: Add a size heuristic if this is too slow
      parents[find(dst)] = find(src);
    }

    /**
     * Sort the edges before union find to make sure equivalent states that
     * contain circles ends up having the same roots.
     * Example: `p ~> MCell q null * q ~> MCell p null`
     *      and `q ~> MCell p null * p ~> MCell q null`
     *      should end up with the same cluster with root `p`.
     */
    edges.sort((e1, e2) => e1.toString().localeCompare(e2.toString()));
    edges.forEach((edge) => union(edge.srcUid, edge.dstUid));

    const clusters: Record<string, DotCluster> = {};
    Object.keys(parents).forEach((uid: string) => {
      const root = find(uid);
      if (!(root in clusters))
        clusters[root] = { root: root, nodes: [], edges: [] };
    });
    nodes.forEach((n) => clusters[find(n.uid)].nodes.push(n));
    edges.forEach((e) => clusters[find(e.srcUid)].edges.push(e));

    return Object.values(clusters);
  }

  protected buildRootPointerNodeEdge(
    uid: string,
    label: string
  ): [DotNode, DotEdge] {
    const ptrUid = uid + '$ptr';
    const node: DotNode = {
      uid: ptrUid,
      label: label,
      attrs: { fontsize: '10', width: '0' }, // FIXME: read from config
    };
    const edge: DotEdge = {
      srcUid: ptrUid,
      srcOutPorts: ['e'],
      dstUid: uid,
      dstInPorts: this.inPortOfUid[uid]
        ? [this.inPortOfUid[uid], 'nw']
        : ['nw'],
      attrs: { tailclip: 'true', minlen: '1' }, // FIXME: read from config
    };
    return [node, edge];
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
      }
      return xml;
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
      `"${node.uid}" ${renderAttrs({ id: node.uid, label: node.label, ...node.attrs })}`;

    const renderExtremity = (uid: string, ports: string[]) =>
      [uid, ...ports].map((a) => `"${a}"`).join(':');

    const renderEdge = (edge: DotEdge) => {
      const src = renderExtremity(edge.srcUid, edge.srcOutPorts);
      const dst = renderExtremity(edge.dstUid, edge.dstInPorts);
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
      return `${src} -> ${dst} ${renderAttrs({ id: `${edge.srcUid}-${edge.srcOutPorts.join('-')}`, ...edge.attrs })}`;
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

  protected buildNodeLabel(pt: AST.HProp_PointsTo): XMLElement {
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

    const label: (term: AST.Term) => XMLChild = (term) => {
      const isLocal = term instanceof AST.Symbol && !term.isGlobal;
      const s = AST.termLabel(term);
      return isLocal ? localLabel(s) : globalLabel(s);
    };

    const header: XMLElement = tr(
      {},
      td(
        { colspan: 2, cellpadding: 0, sides: 'b' },
        box({}, row(pt.locLabel(), ': ', pt.config?.label ?? ''))
      )
    );

    /**
     * See: https://github.com/magjac/d3-graphviz#maintaining-object-constancy
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

    const value = (port: string, x: AST.Term) =>
      constrField(port, label(x), null, '');
    const pointer = (inPort: string, outPort: string, x: AST.Term) =>
      // Or: use '⏺' here and disable InTablePointerEdgeAttr
      constrField(inPort, label(x), outPort, '');

    function getConfig(
      arg: AST.Term,
      idx: number
    ): [arg: AST.Term, config: ArgEntryConfig] {
      assert(pt.config !== undefined, '');
      assert(pt.config.args[idx] !== undefined, '');
      return [arg, pt.config.args[idx]];
    }

    return table(
      { cellborder: pt.config?.drawBorder ? 1 : 0 },
      header,
      ...pt.reprArgs
        .map(getConfig)
        .filter(([, config]) => config.inTable)
        .map(([arg, config]) =>
          this.nodeUids.has(AST.termUid(arg)) || config.forceEdge
            ? pointer(config.inPort, config.outPort, arg)
            : value(config.inPort, arg)
        )
    );
  }

  protected buildEdges(pt: AST.HProp_PointsTo): DotEdge[] {
    const srcUid = pt.locUid();
    const seen = new Set<string>();

    const edges = pt.reprArgs.flatMap((arg, idx) => {
      assert(pt.config !== undefined, '');
      assert(pt.config.args[idx] !== undefined, '');
      const c: ArgEntryConfig = pt.config.args[idx];

      const uid = AST.termUid(arg);
      if (!(this.nodeUids.has(uid) || c.forceEdge)) return [];
      const srcOutPorts = [c.outPort, c.inTable ? 'c' : 'e'];
      const dstUid = uid;
      const dstInPorts = this.inPortOfUid[dstUid]
        ? [this.inPortOfUid[dstUid], 'w']
        : ['w'];
      const edge: DotEdge = {
        srcUid: srcUid,
        srcOutPorts: srcOutPorts,
        dstUid: dstUid,
        dstInPorts: dstInPorts,
        attrs: c.inTable ? InTablePointerEdgeAttrs : {},
      };
      if (srcOutPorts.length == 1 && dstInPorts.length == 1) return [edge];
      // If `edge` starts or ends inside a table, add an invisible node-level
      // edge to reduce edge crossing.
      const key = `${srcUid}-${dstUid}`;
      if (!seen.has(key)) {
        seen.add(key);
        const nodeLevelEdge: DotEdge = {
          srcUid: srcUid,
          srcOutPorts: ['e'],
          dstUid: dstUid,
          dstInPorts: ['w'],
          attrs: {
            // FIXME
            style: 'invis',
            constraint: false,
          },
        };
        return [edge, nodeLevelEdge];
      }
      return [edge];
    });

    return edges;
  }
}

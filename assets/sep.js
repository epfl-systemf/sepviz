'use strict';

// SepParser = require("./parser.node.js");
// Immutable = require('immutable');
// util = require('util');
// example = require("./example.js");
// console.log(util.inspect(render(example), { depth: null }));

// function stringp(x) {
//     return typeof x === 'string' || x instanceof String;
// }

function parse_sep(sep) {
    let objects = [];
    let gensym = {};

    function next(prefix) {
        if (!(prefix in gensym))
            gensym[prefix] = 0;
        return gensym[prefix]++;
    }

    function resolve(name, ctx) {
        return ctx.get(name, {
            global: true,
            uid: name,
            label: name
        });
    }

    function loop(sep, ctx) {
        switch (sep.kind) {
        case "stars":
            sep.conjuncts.forEach(c => loop(c, ctx));
            break;
        case "existential":
            const num = next(sep.binder);
            ctx = ctx.set(sep.binder, {
                global: false,
                uid: sep.binder + "$" + num,
                label: `?${sep.binder}${num}` // ['font', {}, `?${sep.binder}`, ['sub', {}, `${num}`]]
            });
            loop(sep.body, ctx);
            break;
        case "points-to":
            const addr = resolve(sep.from, ctx);
            const [constr, ...args] = sep.to;
            objects.push({
                addr,
                constr,
                args: args.map(a => resolve(a, ctx))
            });
            break;
        case "gc":
            break;
        }
    }

    loop(sep, Immutable.Map({}));
    return objects;
}

function parse(term) {
    let string = [], stack = [];
    SepParser.parse(term).forEach(x => {
        if (typeof x === 'object' && 'raw' in x) {
            stack.push(string.join(""));
            stack.push({ raw: x.raw, objects: parse_sep(x.parsed) });
            string = [];
        } else {
            string.push(x);
        }
    });
    stack.push(string.join(""));
    return stack;
}

function graphviz_input_ports_of_object(obj) {
    switch (obj.constr) {
    case "MCell":
        return { [obj.addr.uid]: ["car_in"] };
    case "MListSeg":
    case "MList":
    case "MQueue":
        return { [obj.addr.uid]: ["list"] };
    default:
        console.error("Unrecognized object:", obj);
        return { [obj.addr.uid]: [] };
    }
}

var SepFontInfo = { // 12: 6.875; 11.5: 5.6:
    name: "Iosevka",
    size: 12,
    charwidth: 6.075, // FIXME not reliable enough.  Recompile graphviz?
}

class XMLContainer {
    constructor(...children) {
        this.children = children;
    }

    get length() {
        return this.children.reduce((sum, c) => sum + c.length, 0);
    }
}

class XMLElement extends XMLContainer {
    constructor(tag, attrs, ...children) {
        super(...children);
        this.tag = tag;
        this.attrs = attrs;
    }
}

function graphviz_label_of_object(obj, known_uids) {
    const xml = (tag, default_attrs={}) => (attrs, ...children) =>
          new XMLElement(tag, { ...default_attrs, ...attrs}, ...children);

    const table = xml('table', { border: 0, cellborder: 1,
                                 cellspacing: 0, cellpadding: 2 }),
          box = xml('table', { border: 0, cellborder: 0,
                               cellspacing: 0, cellpadding: 0 }),
          tr = xml('tr'), td = xml('td'), font = xml('font'), b = xml('b');

    const row = (...vs) =>
          tr({}, ...vs.map(v => td({}, v)));

    // A hack because Viz.js has incorrect font metrics
    // See https://github.com/mdaines/viz.js/wiki/Caveats
    const autosz = (v, fontsize=null) => {
        const sz = fontsize || SepFontInfo.size;
        const height = sz * 1.15, width = sz / SepFontInfo.size * SepFontInfo.charwidth * v.length;
        // Add this here because adding <font> around a <table> changes the font
        // size for the whole graphic (it's a GraphViz bug)
        v = font({ ['point-size']: sz }, v);
        // fixedsize is ignored unless height is set
        return box({ fixedsize: true, width, height }, tr({}, td({ fixedsize: true, width, height, align: "left" }, v)));
    };

    const highlight = (v) => {
        return v.global ? v.label : font({ color: "#3465a4" }, v.label);
    };

    const header =
          tr({}, td({ colspan: 2, cellpadding: 0, sides: "b" },
                    // Need to size each individually, because graphviz
                    // measures them and lays them out individually.
                    autosz(box({}, row(autosz(highlight(obj.addr), 9),
                                       autosz(": ", 9),
                                       autosz(obj.constr, 9))), 9)));

    const value = (port, val) =>
          tr({}, td({ port, colspan: 2 },
                    autosz(highlight(val))));

    const value_null = (port) =>
          tr({}, td({ port, colspan: 2 }, autosz("∅")));

    const pointer = (port_in, port_out, ptr) =>
          tr({},
             td({ port: port_in, sides: "tlb" },
                autosz(highlight(ptr))),
             td({ port: port_out, sides: "trb" },
                autosz("⏺")));

    const value_or_ptr = (port_in, port_out, v) =>
          (v.uid in known_uids ?
           pointer(port_in, port_out, v) :
           (v.label == "null" && v.global ?
            value_null(port_in) : value(port_in, v)));

    switch (obj.constr) {
    case "MCell":
        return table({}, header,
                     value_or_ptr("car_in", "car_out", obj.args[0]),
                     value_or_ptr("cdr_in", "cdr_out", obj.args[1]));
    case "MListSeg":
        return table({ cellborder: 0 }, header,
                     value("list", obj.args[1]));
    case "MList":
    case "MQueue":
        return table({ cellborder: 0 }, header,
                     value("list", obj.args[0]));
    default:
        console.error("Unrecognized object:", obj);
        return table({}, header, ...obj.args.map(a => value(null, a)));
    }
}

function graphviz_node_of_object(obj, priority, known_uids) {
    return {
        name: obj.addr.uid, obj, priority,
        props: { label: graphviz_label_of_object(obj, known_uids) }
    };
}

function graphviz_edges_of_object(obj, input_port_of_uid) {
    const name = obj.addr.uid;

    const cell_edge = (out_port, uid) => {
        const in_port = input_port_of_uid[uid];
        return in_port === undefined ?
            [] : [{ src: [name, ...out_port],
                    dst: [uid, ...in_port, "w"] }];
    };

    switch (obj.constr) {
    case "MCell":
        return [...cell_edge(["car_out", "c"], obj.args[0].uid),
                ...cell_edge(["cdr_out", "c"], obj.args[1].uid)];
    case "MListSeg":
        const uid = obj.args[0].uid;
        const in_port = input_port_of_uid[uid] || [];
        return { src: [name, "list", "e"],
                 dst: [uid, ...in_port, "w"],
                 props: { tailclip: true } };
    case "MList":
    case "MQueue":
        return [];
    default:
        console.error("Unrecognized object:", obj);
        return [].concat(...obj.args.map(a => cell_edge([], a.uid)));
    }
}

function graphviz_pointers_of_object(obj, priority, input_port_of_uid, has_incoming_edges) {
    if (obj.addr.global && !has_incoming_edges[obj.addr.uid]) {// (!) {
        const in_port = input_port_of_uid[obj.addr.uid] || [];
        const ptr_node = obj.addr.uid + '$ptr';
        return  { nodes: [{ name: ptr_node,
                            obj: null, priority,
                            props: { label: obj.addr.label,
                                     fontsize: 10,
                                     width: 0 } }],
                  edges: [{ src: [ptr_node, "e"],
                            dst: [obj.addr.uid, ...in_port, "nw"],
                            props: { tailclip: true, minlen: 1 } }] };
    } else {
        return { nodes: [], edges: [] };
    }
}

function partition({ nodes, edges }) {
    let parents = {};
    nodes.forEach(n => parents[n.name] = n);

    // Run a union-find to cluster the graph into weakly connected components

    function find(n) {
        let parent = parents[n];
        return n == parent.name ? parent : (parents[n] = find(parent.name));
    }

    function union(src, dst) {
        // LATER: Add a size heuristic if this is too slow
        parents[find(dst).name] = find(src);
    }

    edges.forEach(({ src, dst }) => union(src[0], dst[0]));

    // Mark root nodes; this is used to sort the components by priority

    let isRoot = {};
    nodes.forEach(n => isRoot[n.name] = true);
    edges.forEach(e => isRoot[e.dst[0]] = false);

    // Build individual graphs.  The priority (sorting order) of a given graph
    // is the lowest priority among its root nodes

    let graphs = {};
    Object.keys(parents).forEach(p =>
        graphs[find(p).name] = { edges: [], nodes: [], priority: Infinity });
    nodes.forEach(n =>
        graphs[find(n.name).name].nodes.push(n));
    edges.forEach(e =>
        graphs[find(e.src[0]).name].edges.push(e));
    Object.values(graphs).forEach(g =>
        g.priority = Math.min(...g.nodes.map(n => isRoot[n.name] ? n.priority : Infinity)));

    return Object.values(graphs).sort((g1, g2) => g1.priority - g2.priority);
}

function merge(...graphs) {
    return { nodes: [].concat(...graphs.map(g => g.nodes)),
             edges: [].concat(...graphs.map(g => g.edges)) };
}

function graphviz_components_of_objects(objects) {
    const input_port_of_uid =
          Object.assign({}, ...objects.map(graphviz_input_ports_of_object));

    const nodes = objects.map((o, idx) =>
        graphviz_node_of_object(o, idx, input_port_of_uid));
    const edges =
          [].concat(...objects.map(o => graphviz_edges_of_object(o, input_port_of_uid)));

    // Add pointer edges to root nodes
    let has_incoming_edges = {};
    edges.forEach(({ dst }) => has_incoming_edges[dst[0]] = true);
    const pointers = objects.map((o, idx) =>
        graphviz_pointers_of_object(o, idx, input_port_of_uid, has_incoming_edges));

    // Create missing target nodes
    edges.forEach(({ dst }) => {
        if (!(dst[0] in input_port_of_uid))
            nodes.push({ name: dst[0],
                         obj: null, priority: Infinity,
                         props: { label: dst[0], width: 0 } });
    });

    const graphs = partition(merge({ nodes, edges }, ...pointers));

    // TODO: https://graphviz.org/doc/info/attrs.html#a:sortv explains how packmode can be used to preserve the order of the clusters
    // TODO: Add one graph per connected component, use HTML+CSS do the layout as inline-blocks (see ccomps)
    const props = [
        { target: "graph", props: {
            rankdir: "LR",
            ranksep: 0.05,
            nodesep: 0.2,
            concentrate: false,
            splines: true,
            packmode: "array",
            truecolor: true,
            bgcolor: "#00000000",
            pad: 0 } },
        { target: "edge", props: {
            fontname: SepFontInfo.name,
            tailclip: false,
            arrowsize: 0.5,
            minlen: 3 } },
        { target: "node", props: {
            shape: "plaintext",
            margin: 0.05,
            fontsize: SepFontInfo.size,
            fontname: SepFontInfo.name } }
    ];

    return graphs.map(g => [...props, ...g.nodes, ...g.edges]);
}

function graphviz_render_text(graph_name, elements) {
    const map_dict = (attrs, fn) =>
          Object.entries(attrs).filter(v => v[1] !== null).map(fn);

    const render_attr = ([k, v]) =>
          v === null ? `` : ` ${k}="${v}"`;

    const render_attrs = (attrs) =>
          map_dict(attrs, render_attr).join("");

    const render_xml = (xml) => {
        if (xml instanceof XMLElement) {
            return [
                `<${xml.tag}${render_attrs(xml.attrs)}>`,
                ...xml.children.map(render_xml),
                `</${xml.tag}>`
            ].join("");
        } else if (xml instanceof XMLContainer) {
            return xml.children.map(render_xml).join("");
        } else {
            return xml;
        }
    };

    const render_prop = ([k, v]) =>
          (k == "label" ?
           `${k}=<${render_xml(v)}>` :
           `${k}="${v}"`);

    const render_props = (props={}) =>
          "[" + map_dict(props, render_prop).join(", ") + "]";

    const render_extremity = (path) =>
          path.map(a => `"${a}"`).join(':');

    const render_one = (obj) => {
        if ("target" in obj)
            return `${obj.target} ${render_props(obj.props)}`;
        else if ("name" in obj)
            return `"${obj.name}" ${render_props(obj.props)}`;
        else if ("src" in obj)
            return `${render_extremity(obj.src)} -> ${render_extremity(obj.dst)} ${render_props(obj.props)}`;
        console.error("Unrecognized GraphViz construct:", obj);
        return "";
    };

    return [`digraph ${JSON.stringify(graph_name)} {`,
            ...elements.map(render_one),
            "}"].join("\n");
}

function trimSVG(container) {
    // Graphviz leaves blank space around the diagram, but the following isn't
    // enough, because the <g> also has blank space inside.
    container.querySelectorAll("svg").forEach(svg => {
        const { x, y, width, height } = svg.getBBox();
        svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
    });
}

var viz = new Viz();

function render_graphviz(fragment) {
    const graphs = graphviz_components_of_objects(fragment.objects);
    return graphs.map(g => {
        const graph_node = document.createElement("span");

        const dot = graphviz_render_text(fragment.raw, g);
        viz.renderSVGElement(dot)
            .then(element => graph_node.append(element))
            .catch(error => {
                // https://github.com/mdaines/viz.js/wiki/Caveats
                viz = new Viz();
                console.error(error);
                console.log("Erroneous dot file:", dot);
            });

        return { dot, graph_node };
    });
}

function render_embedded() {
    document.querySelectorAll(".goal-conclusion .highlight, .coq-message, .goal-hyp .highlight").forEach(goal => {
        const _goal = goal.cloneNode(false);
        goal.parentNode.replaceChild(_goal, goal);

        parse(goal.innerText).forEach(parse_unit => {
            if (typeof parse_unit === 'object' && 'raw' in parse_unit) {
                const host = document.createElement("span");
                host.className = "sep-graph";
                _goal.append(host);

                render_graphviz(parse_unit).forEach(({ dot, graph_node }) => {
                    const src_node = document.createElement('span');
                    const dot_node = document.createElement('span');

                    // FIXME each component is labeled with the full graph
                    src_node.append(document.createTextNode(parse_unit.raw));
                    dot_node.append(document.createTextNode(dot));
                    graph_node.className = "sep-graph-svg";
                    src_node.className = "sep-graph-source";
                    dot_node.className = "sep-graph-dot";

                    const views = [graph_node, src_node, dot_node];
                    host.append(graph_node);

                    const onclick = () => {
                        host.replaceChild(views[1], views[0]);
                        views.push(views.shift());
                    };

                    views.forEach(v => {
                        v.onclick = onclick;
                        v.title = parse_unit.raw;
                    });
                });
            } else {
                _goal.append(document.createTextNode(parse_unit));
            }
        });
    });
}

render_embedded();

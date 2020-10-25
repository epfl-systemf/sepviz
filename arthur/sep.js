'use strict';

// SepParser = require("./parser.node.js");
// Immutable = require('immutable');
// util = require('util');
// example = require("./example.js");
// console.log(util.inspect(render(example), { depth: null }));

function stringp(x) {
    return typeof x === 'string' || x instanceof String;
}

function parse_sep(sep) {
    var objects = [];
    var gensym = {};

    function next(prefix) {
        if (!(prefix in gensym))
            gensym[prefix] = 0;
        return prefix + "$" + (gensym[prefix]++);
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
            ctx = ctx.set(sep.binder, {
                global: false,
                uid: next(sep.binder),
                label: sep.binder
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

function render(term) {
    var string = [], stack = [];
    SepParser.parse(term).forEach(x => {
        if (stringp(x))
            string.push(x);
        else {
            stack.push(string.join(""));
            stack.push(parse_sep(x));
            string = [];
        }
    });
    stack.push(string.join(""));
    return stack;
}

function render_sep(container, objects) {
    container = d3.select(container);

    const node = container.append('span');
    node.node().className = "sep-graph";
    node.node().style.display = "inline-block";
    node.node().style.height = "50em";
    node.node().style.width = "50em";

    const svg = node.append('svg');
    const inner = svg.append('g');

    const DIM = 15;
    var g = new dagreD3.graphlib.Graph({ compound: true }).setGraph({
        rankdir: 'LR',
        edgesep: 2 * DIM,
        ranksep: 2 * DIM,
        nodesep: 2 * DIM
    });

    const EDGE = {
        style: "stroke: #2e3436; stroke-width: 1.5; fill: none;",
        curve: d3.curveBasis,
        // arrowheadStyle: "fill: none;"
    };

    const POINTER_NODE = {
        style: "fill: white",
        shape: "circle",
        labelStyle: "fill: #2e3436; font-size: 18px;",
        width: DIM,
        height: DIM
    };
    const RECORD_NODE = {
        style: "fill: white",
        shape: "rect",
        labelStyle: "fill: #2e3436; font-size: 18px;",
        width: DIM,
        height: DIM
    };
    const HEAD_NODE = {
        style: "fill: white",
        shape: "circle",
        labelStyle: "fill: #2e3436; font-size: 18px;",
        width: DIM,
        height: DIM
    };
    const ARG_NODE = {
        style: "fill: white",
        shape: "rect",
        labelStyle: "fill: #2e3436; font-size: 18px;",
        width: DIM,
        height: DIM
    };
    const INVISIBLE_NODE_PROPS = {
        style: "visibility: hidden;"
    };

    console.log("---------------");

    // g.setNode("p1$ptr", { label: "p1", ...POINTER_NODE });
    // g.setNode("p1", { label: "MQueue", ...HEAD_NODE });
    // g.setEdge("p1$ptr", "p1", { ...EDGE });

    // g.setNode("p2$ptr", { label: "p2", ...POINTER_NODE });
    // g.setNode("p2", { label: "MQueue", ...HEAD_NODE });
    // g.setEdge("p2$ptr", "p2", { ...EDGE });

    // var gensym = 0;
    for (var uid in objects) {
        const ptr = addr + "!ptr";
        const record = addr + "!record";

        const {addr, constr, args} = objects[uid];

        g.setNode(ptr, { label: addr.label, ...POINTER_NODE });
        // console.log("node:", ptr);
        g.setNode(record, { ...RECORD_NODE });
        // console.log("node:", record);

        g.setNode(addr, { label: constr, ...HEAD_NODE });
        // console.log("node:", addr);
        g.setParent(addr, record);
        g.setEdge(ptr, addr, { ...EDGE });
        // console.log("edge:", ptr, "→", addr);

        args.forEach((a, id) => {
            const arg = addr + "!arg!" + id;
            g.setNode(arg, { label: a, ...ARG_NODE });
            g.setParent(arg, record);
            // console.log("node:", arg);
            if (a in objects) {
                g.setEdge(arg, a, { ...EDGE });
                // console.log("edge:", arg, "→", a);
            }
        });

        // break;
    }

    /*
    var dfs = tree => {

        if (tree.kind === "node") {
            var label = d3.select(document.createElementNS('http://www.w3.org/2000/svg', 'text'));
            label.append("tspan")
                .attr('x', '0')
                .attr('dy', '1em')
                .text(tree.value);
            g.setNode(id, { label: label.node(), labelType: "svg", ...NODE_PROPS(tree.color) });;
            if (tree.left.kind == "node" || tree.right.kind == "node") {
                const left = dfs(tree.left), right = dfs(tree.right);
                g.setEdge(id, left, EDGE_PROPS(tree.left.kind));
                g.setEdge(id, right, EDGE_PROPS(tree.right.kind));
            }
            return id;
        }

        g.setNode(id, { label: "", ...INVISIBLE_NODE_PROPS });;
        return id;
    }

    dfs(data.tree);
    */

    // Set up zoom support
    // var zoom = d3.zoom().on("zoom", () => {
    //     inner.attr("transform", d3.event.transform);
    // });
    // svg.call(zoom);

    // Create the renderer
    var render = new dagreD3.render();

    // Run the renderer. This is what draws the final graph.
    render(inner, g);

    // Scale the graph relative to the reference font size (16px)
    svg.attr('height', "50em");
    svg.attr("width", "50em");

    // var { height, width } = svg.node().getBoundingClientRect();
    // var scale = height / (16 * 8.5) * 1; // 16px * svg.attr('height')

    // const threshold = 0.5;
    // if (g.graph().height < threshold * height / scale) {
    //     svg.attr("height", threshold * height);
    // }

    // const scaled_offset = (width - g.graph().width * scale) / 2;
    // svg.call(zoom.transform, d3.zoomIdentity.translate(scaled_offset, 0).scale(scale));
}

function render_sep(container, objects) {
    var nodes = [];
    var edges = [];
    // var constraints = [];

    for (var uid in objects) {
        const {addr, constr, args} = objects[uid];

        const ptr = addr.uid + "!ptr";

        const label = constr + ' ' + args.map(a => a.label).join(' ');
        nodes.push({ data: { id: addr.uid, label } });
        // console.log("node:", addr);

        if (addr.global) {
            nodes.push({ data: { id: ptr, label: addr.label } });
            edges.push({ data: { id: ptr + "→" + addr.uid, source: ptr, target: addr.uid }});
        }
        // console.log("node:", ptr);
        // nodes.push({ data: { id: record } });
        // console.log("node:", record);
        // console.log("edge:", ptr, "→", addr);
    }

    for (var uid in objects) {
        const {addr, constr, args} = objects[uid];

        // var constraint = [{ node: addr }];
        // constraints.push(constraint);
        args.forEach((a, id) => {
            const arg = addr.uid + "!arg!" + id;
            // nodes.push({ data: { id: arg, label: a } });
            // constraint.push({ node: arg });
            // console.log("node:", arg);
            if (a.uid in objects) {
                edges.push({ data: { id: arg + "→" + a.uid, source: addr.uid, target: a.uid }});
                // console.log("edge:", arg, "→", a);
            }
        });
    }

    // console.log(nodes);
    // console.log(edges);

    var cy = cytoscape({
        container,

        // boxSelectionEnabled: false,

        style: [
            {
                selector: 'node[label]',
                css: {
                    'shape': 'rectangle',
                    'width': 'label',
                    'content': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center'
                }
            },
            {
                selector: ':parent',
                css: {
                    'text-valign': 'top',
                    'text-halign': 'center',
                }
            },
            {
                selector: 'edge',
                css: {
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle'
                }
            }
        ],

        elements: { nodes, edges },

        layout: {
            name: 'dagre',
            // flow: { axis: 'x', minSeparation: 20 }
        }
    });

    // constraints = constraints.map(c =>
    //     c.map(({ node }, offset) => ({ node: cy.$id(node), offset })));

    // cy.layout({
    //         name: 'cola',
    //         flow: { axis: 'x', minSeparation: 20 }, // use DAG/tree flow layout if specified, e.g. { axis: 'y', minSeparation: 30 }
    //         // alignment: { horizontal: constraints }, // relative alignment constraints on nodes, e.g. {vertical: [[{node: node1, offset: 0}, {node: node2, offset: 5}]], horizontal: [[{node: node3}, {node: node4}], [{node: node5}, {node: node6}]]}

    //         // padding: 5
    // }).run();
}

function render_sep(container, objects) {
    var nodes = [];
    var edges = [];

    for (var uid in objects) {
        const {addr, constr, args} = objects[uid];

        const ptr = addr.uid + "!ptr";

        const label = constr + ' ' + args.map(a => a.label).join(' ');
        nodes.push({ data: { id: addr.uid, label } });
        // console.log("node:", addr);

        if (addr.global) {
            nodes.push({ data: { id: ptr, label: addr.label } });
            edges.push({ data: { id: ptr + "→" + addr.uid, source: ptr, target: addr.uid }});
        }
        // console.log("node:", ptr);
        // nodes.push({ data: { id: record } });
        // console.log("node:", record);
        // console.log("edge:", ptr, "→", addr);
    }

    for (var uid in objects) {
        const {addr, constr, args} = objects[uid];

        // var constraint = [{ node: addr }];
        // constraints.push(constraint);
        args.forEach((a, id) => {
            const arg = addr.uid + "!arg!" + id;
            // nodes.push({ data: { id: arg, label: a } });
            // constraint.push({ node: arg });
            // console.log("node:", arg);
            if (a.uid in objects) {
                edges.push({ data: { id: arg + "→" + a.uid, source: addr.uid, target: a.uid }});
                // console.log("edge:", arg, "→", a);
            }
        });
    }
}

function graphviz_input_ports_of_object(obj) {
    switch (obj.constr) {
    case "MCell":
        return { [obj.addr.uid]: ["car_in", "w"] };
    case "MListSeg":
    case "MList":
        return { [obj.addr.uid]: ["list", "w"] };
    default:
        console.error("Unrecognized object:", obj);
        return { [obj.addr.uid]: [] };
    }
}

function graphviz_label_of_object(obj, known_uids) {
    const xml = (node, default_attrs={}) => (attrs, ...contents) =>
          [node, { ...default_attrs, ...attrs}, ...contents];

    const table = xml('table', { border: 0,
                                 cellborder: 1,
                                 cellspacing: 0,
                                 cellpadding: 4 }),
          tr = xml('tr'), td = xml('td'), font = xml('font');

    const header =
          tr({}, td({ colspan: 2, cellpadding: 0, sides: "b" },
                    font({ ['point-size']: 10 }, obj.constr)));

    const value = (port, val) =>
          tr({}, td({ port, colspan: 2 }, val.label));

    const value_null = (port) =>
          tr({}, td({ port, colspan: 2 }, "∅"));

    const pointer = (port_in, port_out, ptr) =>
          tr({},
             td({ port: port_in, sides: "tlb" }, ptr.label),
             td({ port: port_out, sides: "trb" }, "⏺"));

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
    case "MList":
        return table({ cellborder: 0 }, header,
                     value("list", obj.args[0]));
    default:
        console.error("Unrecognized object:", obj);
        return table({}, header, ...obj.args.map(a => value(null, a)));
    }
} // FIXME add node definition around this.

function graphviz_node_of_object(obj, known_uids) {
    return {
        name: obj.addr.uid,
        props: { label: graphviz_label_of_object(obj, known_uids) }
    };
}

function graphviz_edges_of_object(obj, input_port_of_uid) {
    const name = obj.addr.uid;

    const cell_edge = (out_port, uid) => {
        const in_port = input_port_of_uid[uid];
        return in_port === undefined ?
            [] : [{ src: [name, ...out_port], dst: [uid, ...in_port] }];
    };

    switch (obj.constr) {
    case "MCell":
        return [...cell_edge(["car_out", "c"], obj.args[0].uid),
                ...cell_edge(["cdr_out", "c"], obj.args[1].uid)];
    case "MListSeg":
        // TODO: later code should handle the case where v doesn't exist
        const uid = obj.args[0].uid;
        const in_port = input_port_of_uid[uid] || null;
        return { src: [name, "list", "e"],
                 dst: [uid, ...in_port],
                 props: { tailclip: true } };
    case "MList":
        return [];
    default:
        console.error("Unrecognized object:", obj);
        return [].concat(...obj.args.map(a => cell_edge([], a.uid)));
    }
}

function graphviz_graph_of_objects(objects) {
    const input_port_of_uid =
          Object.assign({}, ...objects.map(graphviz_input_ports_of_object));
    const nodes = objects.map(o =>
        graphviz_node_of_object(o, input_port_of_uid));
    const edges =
          [].concat(...objects.map(o => graphviz_edges_of_object(o, input_port_of_uid)));
    const props = [
        { target: "graph", props: { rankdir: "LR", ranksep: 0.35, splines: true, packmode: "graph" } },
        { target: "edge", props: { fontname: "Iosevka", tailclip: false, minlen: 1 } },
        { target: "node", props: { shape: "plaintext", fontname: "Iosevka", sep: 2 } }
    ];

    return { name: "G",
             objects: [...props, ...nodes, ...edges] };
}

function graphviz_render_text(graph) {
    const map_dict = (attrs, fn) =>
          Object.entries(attrs).filter(v => v[1] !== null).map(fn);

    const render_attr = ([k, v]) =>
          v === null ? `` : ` ${k}="${v}"`;

    const render_attrs = (attrs) =>
          map_dict(attrs, render_attr).join("");

    const render_xml = (xml) => {
        if (stringp(xml)) {
            return xml;
        } else {
            const [node, attrs, ...contents] = xml;
            return [
                `<${node}${render_attrs(attrs)}>`,
                ...contents.map(render_xml),
                `</${node}>`
            ].join("");
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

    return [`digraph ${graph.name} {`,
            ...graph.objects.map(render_one),
            "}"].join("\n");
}

function render_graphviz(container, objects) {
    const graph = graphviz_graph_of_objects(objects);
    container.append(document.createTextNode(graphviz_render_text(graph)));
    return;

    objects.forEach(({addr, constr, args}) => {
        const ptr = addr.uid + "!ptr";

        const label = constr + ' ' + args.map(a => a.label).join(' ');
        nodes.push({ data: { id: addr.uid, label } });
        // console.log("node:", addr);

        if (addr.global) {
            nodes.push({ data: { id: ptr, label: addr.label } });
            edges.push({ data: { id: ptr + "→" + addr.uid, source: ptr, target: addr.uid }});
        }
        // console.log("node:", ptr);
        // nodes.push({ data: { id: record } });
        // console.log("node:", record);
        // console.log("edge:", ptr, "→", addr);
    });

    objects.forEach(({addr, constr, args}) => {
        args.forEach((a, id) => {
            const arg = addr.uid + "!arg!" + id;
            // nodes.push({ data: { id: arg, label: a } });
            // constraint.push({ node: arg });
            // console.log("node:", arg);
            if (a.uid in objects) {
                edges.push({ data: { id: arg + "→" + a.uid, source: addr.uid, target: a.uid }});
                // console.log("edge:", arg, "→", a);
            }
        });
    });

}


function render_embedded() {
    document.querySelectorAll(".goal-conclusion").forEach(goal => {
        const _goal = goal.cloneNode(false);
        goal.parentNode.replaceChild(_goal, goal);

        render(goal.innerText).forEach(obj => {
            if (stringp(obj)) {
                _goal.append(document.createTextNode(obj));
            } else {
                const host = document.createElement('span');
                host.className = "sep"; // FIXME -graph
                _goal.append(host);
                render_graphviz(host, obj);
            }
        });
    });
}

render_embedded();

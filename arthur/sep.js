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
    var memories = {};
    var gensym = {};

    function next(prefix) {
        if (!(prefix in gensym))
            gensym[prefix] = 0;
        return prefix + "$" + (gensym[prefix]++);
    }

    function resolve(name, ctx) {
        return ctx.get(name, name);
    }

    function loop(sep, ctx) {
        switch (sep.kind) {
        case "stars":
            sep.conjuncts.forEach(c => loop(c, ctx));
            break;
        case "existential":
            ctx = ctx.set(sep.binder, next(sep.binder));
            loop(sep.body, ctx);
            break;
        case "points-to":
            const addr = resolve(sep.from, ctx);
            const [constr, ...args] = sep.to;
            memories[addr] = [constr, args.map(a => resolve(a, ctx))];
            break;
        case "gc":
            break;
        }
    }

    loop(sep, Immutable.Map({}));
    return memories;
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

function render_sep(container, memories) {
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
    for (var addr in memories) {
        const ptr = addr + "!ptr";
        const record = addr + "!record";

        g.setNode(ptr, { label: addr, ...POINTER_NODE });
        console.log("node:", ptr);
        g.setNode(record, { ...RECORD_NODE });
        console.log("node:", record);

        const [hd, args] = memories[addr];
        g.setNode(addr, { label: hd, ...HEAD_NODE });
        console.log("node:", addr);
        g.setParent(addr, record);
        g.setEdge(ptr, addr, { ...EDGE });
        console.log("edge:", ptr, "→", addr);

        args.forEach((a, id) => {
            const arg = addr + "!arg!" + id;
            g.setNode(arg, { label: a, ...ARG_NODE });
            g.setParent(arg, record);
            console.log("node:", arg);
            if (a in memories) {
                g.setEdge(arg, a, { ...EDGE });
                console.log("edge:", arg, "→", a);
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

function render_sep(container, memories) {
    var nodes = [];
    var edges = [];
    var constraints = [];

    for (var addr in memories) {
        const ptr = addr + "!ptr";
        const record = addr + "!record";

        nodes.push({ data: { id: ptr, label: addr } });
        console.log("node:", ptr);
        nodes.push({ data: { id: record } });
        console.log("node:", record);

        const [hd, args] = memories[addr];
        nodes.push({ data: { id: addr, label: hd, parent: record } });
        console.log("node:", addr);
        edges.push({ data: { id: ptr + "→" + addr, source: ptr, target: addr }});
        console.log("edge:", ptr, "→", addr);

        var constraint = [{ node: addr }];
        constraints.push(constraint);
        args.forEach((a, id) => {
            const arg = addr + "!arg!" + id;
            nodes.push({ data: { id: arg, label: a, parent: record } });
            constraint.push({ node: arg });
            console.log("node:", arg);
            if (a in memories) {
                edges.push({ data: { id: arg + "→" + a, source: arg, target: a }});
                console.log("edge:", arg, "→", a);
            }
        });

        // break;
    }

    console.log(nodes);
    console.log(edges);

    var cy = cytoscape({
        container,

        // boxSelectionEnabled: false,

        style: [
            {
                selector: 'node[label]',
                css: {
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

        elements: {
            nodes
            // : [
            //     { data: { id: 'a', parent: 'b' }, position: { x: 215, y: 85 } },
            //     { data: { id: 'b' } },
            //     { data: { id: 'c', parent: 'b' }, position: { x: 300, y: 85 } },
            //     { data: { id: 'd' }, position: { x: 215, y: 175 } },
            //     { data: { id: 'e' } },
            //     { data: { id: 'f', parent: 'e' }, position: { x: 300, y: 175 } }
            // ]
            ,
            edges
            // : [
            //     { data: { id: 'ad', source: 'a', target: 'd' } },
            //     { data: { id: 'eb', source: 'e', target: 'b' } }
            // ]
        },

        // layout: {
        //     name: 'cola',
        //     flow: { axis: 'x', minSeparation: 20 }
        // }
    });

    constraints = constraints.map(c =>
        c.map(({ node }, offset) => ({ node: cy.$id(node), offset })));

    cy.layout({
            name: 'cola',
            flow: { axis: 'x', minSeparation: 20 }, // use DAG/tree flow layout if specified, e.g. { axis: 'y', minSeparation: 30 }
            // alignment: { horizontal: constraints }, // relative alignment constraints on nodes, e.g. {vertical: [[{node: node1, offset: 0}, {node: node2, offset: 5}]], horizontal: [[{node: node3}, {node: node4}], [{node: node5}, {node: node6}]]}

            // padding: 5
    }).run();
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
                host.className = "sep-graph";
                _goal.append(host);
                render_sep(host, obj);
            }
        });
    });
}

render_embedded();

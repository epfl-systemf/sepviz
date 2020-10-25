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

function parse(term) {
    var string = [], stack = [];
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

function graphviz_label_of_object(obj, known_uids) {
    const xml = (node, default_attrs={}) => (attrs, ...contents) =>
          [node, { ...default_attrs, ...attrs}, ...contents];

    const table = xml('table', { border: 0,
                                 cellborder: 1,
                                 cellspacing: 0,
                                 cellpadding: 2 }),
          tr = xml('tr'), td = xml('td'), font = xml('font');

    const header =
          tr({}, td({ colspan: 2, cellpadding: 0, sides: "b" },
                    font({ ['point-size']: 8 }, obj.constr)));

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
            [] : [{ src: [name, ...out_port], dst: [uid, ...in_port, "w"] }];
    };

    switch (obj.constr) {
    case "MCell":
        return [...cell_edge(["car_out", "c"], obj.args[0].uid),
                ...cell_edge(["cdr_out", "c"], obj.args[1].uid)];
    case "MListSeg":
        // TODO: later code should handle the case where v doesn't exist
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

function graphviz_pointer_edges_of_object(obj, input_port_of_uid) {
    if (obj.addr.global) {
        const in_port = input_port_of_uid[obj.addr.uid] || [];
        return  { src: ["_" + obj.addr.label],
                  dst: [obj.addr.uid, ...in_port, "nw"],
                  props: { tailclip: true } };
    } else {
        return [];
    }
}

function graphviz_graph_of_objects(objects) {
    const input_port_of_uid =
          Object.assign({}, ...objects.map(graphviz_input_ports_of_object));
    const nodes = objects.map(o =>
        graphviz_node_of_object(o, input_port_of_uid));
    const edges =
          [].concat(...objects.map(o => graphviz_edges_of_object(o, input_port_of_uid)),
                    ...objects.map(o => graphviz_pointer_edges_of_object(o, input_port_of_uid)));
    // TODO: https://graphviz.org/doc/info/attrs.html#k:packMode explains how
    // packmode can be used to preserve the order of the clusters
    const props = [
        { target: "graph", props: {
            rankdir: "LR",
            ranksep: 0.35,
            splines: true,
            packmode: "array",
            truecolor: true,
            fontsize: 12,
            bgcolor: "#00000000" } },
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
        if (Array.isArray(xml)) {
            const [node, attrs, ...contents] = xml;
            return [
                `<${node}${render_attrs(attrs)}>`,
                ...contents.map(render_xml),
                `</${node}>`
            ].join("");
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

    return [`digraph ${graph.name} {`,
            ...graph.objects.map(render_one),
            "}"].join("\n");
}

var viz = new Viz();

function render_graphviz(container, objects) {
    const graph = graphviz_graph_of_objects(objects);

    // FIXME missing pointer name edges

    viz.renderSVGElement(graphviz_render_text(graph))
        .then(element => container.append(element))
        .catch(error => {
            // Create a new Viz instance (@see Caveats page for more info)
            viz = new Viz();
            console.error(error);
        });
    return;

    // FIXME
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

        parse(goal.innerText).forEach(fragment => {
            if (typeof fragment === 'object' && 'raw' in fragment) {
                const host = document.createElement('span');
                host.className = "sep-graph";
                _goal.append(host);
                render_graphviz(host, fragment.objects);
                host.onclick = () => {
                    const text = document.createTextNode(fragment.raw);
                    host.parentNode.replaceChild(text, host);
                };
            } else {
                _goal.append(document.createTextNode(fragment));
            }
        });
    });
}

render_embedded();

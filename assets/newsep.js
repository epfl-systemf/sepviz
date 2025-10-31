import * as SepParser from "./parser.js";
("use strict");

document.addEventListener("DOMContentLoaded", init);

// TODO: read from a separated config file.
const configOfConstr = {
  MCell: {
    inPorts: ["car_in"],
    isFlat: true,
    args: {
      0: {
        inTable: true,
        inPorts: ["car_in"],
        outPorts: ["car_out"],
      },
      1: {
        inTable: true,
        inPorts: ["cdr_in"],
        outPorts: ["cdr_out"],
      },
    },
  },
  MListSeg: {
    inPorts: ["list_in"],
    isFlat: false,
    args: {
      0: {
        inTable: false,
        isPointer: true, // For any instance of this construct, this field is always a pointer
        outPorts: ["list"],
      },
      1: {
        inTable: true,
        inPorts: ["list"],
        outPorts: ["list"],
      },
    },
  },
  MList: {
    inPorts: [],
    isFlat: false,
    args: {
      0: {
        inTable: false,
      },
    },
  },
  MQueue: {
    inPorts: ["list"],
    isFlat: false,
    args: {
      0: {
        inTable: true,
        inPorts: ["list"],
        outPorts: ["list"],
      },
    },
  },
  MNode: {
    inPorts: ["in0"],
    isFlat: true,
    args: {
      0: {
        inTable: true,
        inPorts: ["in0"],
        outPorts: ["out0"],
      },
      1: {
        inTable: true,
        inPorts: ["in1"],
        outPorts: ["out1"],
      },
      2: {
        inTable: true,
        inPorts: ["in2"],
        outPorts: ["out2"],
      },
    },
  },
  MTree: {
    inPorts: ["tree"],
    isFlat: false,
    args: {
      0: {
        inTable: true,
        inPorts: ["tree"],
        outPorts: ["tree"],
      },
    },
  },
};

function parseHeapPredicate(hpred) {
  let objects = [];
  let purePredicates = [];
  let gensym = {};

  function next(prefix) {
    if (!(prefix in gensym)) gensym[prefix] = 0;
    return gensym[prefix]++;
  }

  function resolve(name, ctx) {
    return ctx.get(name, {
      global: true,
      uid: name,
      label: name,
    });
  }

  function loop(hpred, ctx) {
    switch (hpred.kind) {
      case "stars":
        hpred.conjuncts.forEach((c) => loop(c, ctx));
        break;
      case "existential":
        const num = next(hpred.binder);
        ctx = ctx.set(hpred.binder, {
          global: false,
          uid: hpred.binder + "$" + num,
          label: `?${hpred.binder}${num}`, // ['font', {}, `?${hpred.binder}`, ['sub', {}, `${num}`]]
        });
        loop(hpred.body, ctx);
        break;
      case "pointsTo":
        const addr = resolve(hpred.from, ctx);
        const [constr, ...args] = hpred.to;
        objects.push({
          addr,
          constr,
          args: args.map((a) => resolve(a, ctx)),
        });
        break;
      case "gc":
        break;
      case "purePredicate":
        const predicate = hpred.predicate.map((x) =>
          ctx.has(x) ? resolve(x, ctx) : x,
        );
        purePredicates.push(predicate);
        break;
      default:
        throw new Error("Not supported kind: ${hpred.kind}");
    }
  }

  loop(hpred, Immutable.Map({}));
  return { objects: objects, purePredicates: purePredicates };
}

function parse(term) {
  let string = [],
    stack = [];
  var res;
  SepParser.parse(term).forEach((x) => {
    if (typeof x === "object" && "raw" in x) {
      stack.push(string.join(""));
      res = parseHeapPredicate(x.parsed);
      stack.push({
        raw: x.raw,
        objects: res.objects,
        purePredicates: res.purePredicates,
      });
      string = [];
    } else {
      string.push(x);
    }
  });
  stack.push(string.join(""));
  return stack;
}

// Create DOM element with class and optional text/attrs.
function createElement(tag, classList = [], { text, attrs } = {}) {
  const node = document.createElement(tag);
  classList.forEach((c) => node.classList.add(c));
  if (text != null) node.append(document.createTextNode(text));
  if (attrs)
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Put all pure predicates in a box.
function renderPurePredicates(purePredicates) {
  const host = createElement("div", ["sep-pure-predicate-container"]);
  purePredicates.forEach((predicate) => {
    let predicateNode = createElement("div", ["sep-pure-predicate"]);
    predicate.forEach((part, index) => {
      if (index != 0) predicateNode.appendChild(document.createTextNode(" "));
      const partNode = document.createElement("span");
      if (typeof part === "object" && "label" in part) {
        partNode.textContent = part.label;
        partNode.className = "sep-exist-var";
      } else {
        partNode.textContent = part;
      }
      predicateNode.appendChild(partNode);
    });
    host.appendChild(predicateNode);
  });
  return host;
}

var SepFontInfo = {
  name: "Iosevka",
  size: 12, // 12: 6.875; 11.5: 5.6:
  charwidth: 6.075, // FIXME not reliable enough.  Recompile graphviz?
};

class GraphvizNode {
  constructor(name, label, otherProps = {}) {
    this.name = name;
    this.props = { label: label, ...otherProps };
  }
}

class GraphvizEdge {
  constructor(src, dst, props = {}) {
    this.src = src;
    this.dst = dst;
    this.props = props;
  }
}

function graphvizEdgesOfObject(obj, knownUids, inPortOfUid) {
  const srcUid = obj.addr.uid;
  const config = configOfConstr[obj.constr]["args"];

  return obj.args
    .map((arg, argIdx) => {
      const c = config[argIdx];
      const dstUid = arg.uid;
      const dstInPort = inPortOfUid[dstUid] || [];
      return knownUids.has(dstUid) || c["isPointer"] // This field is a pointer
        ? new GraphvizEdge(
            [srcUid, ...c["outPorts"], ...[c["inTable"] ? "c" : "e"]],
            [dstUid, ...dstInPort, "w"],
          )
        : null;
    })
    .filter(Boolean);
}

function graphvizPointersOfObject(obj, inPortOfUid, hasIncomingEdges) {
  const uid = obj.addr.uid;
  let ptrNode = null,
    ptrEdge = null;
  if (obj.addr.global && !hasIncomingEdges[uid]) {
    const inPort = inPortOfUid[uid] || [];
    const ptrNodeName = uid + "$ptr";
    ptrNode = new GraphvizNode(ptrNodeName, obj.addr.label, {
      fontsize: 10,
      width: 0,
    });
    ptrEdge = new GraphvizEdge([ptrNodeName, "e"], [uid, ...inPort, "nw"], {
      tailclip: true,
      minlen: 1,
    });
  }
  return [ptrNode, ptrEdge];
}

function graphvizInputPortsOfConstr(constr) {
  if (!(constr in configOfConstr)) {
    console.error("Unrecognized structure:", constr);
    return [];
  }
  return configOfConstr[constr]["inPorts"];
}

class XMLContainer {
  constructor(...children) {
    this.children = children;
  }
}

class XMLElement extends XMLContainer {
  constructor(tag, attrs, ...children) {
    super(...children);
    this.tag = tag;
    this.attrs = attrs;
  }
}

// TODO: read from config
function graphvizLabelOfObject(obj, knownUids) {
  const xml =
    (tag, defaultAttrs = {}) =>
    (attrs, ...children) =>
      new XMLElement(tag, { ...defaultAttrs, ...attrs }, ...children);

  const table = xml("table", {
      border: 0,
      cellborder: 1,
      cellspacing: 0,
      cellpadding: 2,
    }),
    box = xml("table", {
      border: 0,
      cellborder: 0,
      cellspacing: 0,
      cellpadding: 0,
    }),
    tr = xml("tr"),
    td = xml("td"),
    font = xml("font"),
    b = xml("b");

  const row = (...vs) => tr({}, ...vs.map((v) => td({}, v)));

  const label = (v) => {
    return v.global
      ? v.label == "null"
        ? "∅"
        : v.label
      : font({ color: "#3465a4" }, v.label);
  };

  const header = tr(
    {},
    td(
      { colspan: 2, cellpadding: 0, sides: "b" },
      box({}, row(label(obj.addr), ": ", obj.constr)),
    ),
  );

  const value = (port, v) => tr({}, td({ port: port, colspan: 2 }, label(v)));

  const pointer = (inPort, outPort, ptr) =>
    tr(
      {},
      td({ port: inPort, sides: "tlb" }, label(ptr)),
      td({ port: outPort, sides: "trb" }, "⏺"),
    );

  const valueOrPointer = (inPort, outPort, v) =>
    knownUids.has(v.uid) ? pointer(inPort, outPort, v) : value(inPort, v);

  const config = configOfConstr[obj.constr];
  return table(
    {
      cellborder: config["isFlat"] ? 1 : 0,
    },
    header,
    ...obj.args
      .map((arg, argIdx) => {
        const c = config["args"][argIdx];
        return c["inTable"]
          ? knownUids.has(arg.uid) || c["isPointer"]
            ? valueOrPointer(c["inPorts"][0], c["outPorts"][0], arg)
            : value(c["inPorts"], arg)
          : null;
      })
      .filter(Boolean),
  );
}

function graphvizNodeOfObject(obj, knownUids) {
  return new GraphvizNode(obj.addr.uid, graphvizLabelOfObject(obj, knownUids));
}

function graphvizDiagramComponents(objects) {
  // `knownUids` is also the set of appeared pointers.
  const knownUids = new Set(objects.map((obj) => obj.addr.uid));
  const inPortOfUid = Object.fromEntries(
    objects.map((obj) => [
      obj.addr.uid,
      graphvizInputPortsOfConstr(obj.constr),
    ]),
  );

  const nodes = objects.map((obj) => graphvizNodeOfObject(obj, knownUids));
  const edges = [].concat(
    ...objects.map((obj) => graphvizEdgesOfObject(obj, knownUids, inPortOfUid)),
  );

  // Add pointer edges to root nodes.
  let hasIncomingEdges = {};
  edges.forEach(({ dst }) => (hasIncomingEdges[dst[0]] = true));
  objects.forEach((obj) => {
    const [ptrNode, ptrEdge] = graphvizPointersOfObject(
      obj,
      inPortOfUid,
      hasIncomingEdges,
    );
    if (ptrNode) nodes.push(ptrNode);
    if (ptrEdge) edges.push(ptrEdge);
  });

  // Create missing target nodes.
  edges.forEach(({ dst }) => {
    const uid = dst[0];
    if (!knownUids.has(uid))
      nodes.push(new GraphvizNode(uid, uid, { width: 0 }));
  });

  // NOTE: https://graphviz.org/doc/info/attrs.html#a:sortv explains how packmode can be used to preserve the order of the clusters
  // NOTE: Add one graph per connected component, use HTML+CSS do the layout as inline-blocks (see ccomps)?
  const props = [
    {
      target: "graph",
      props: {
        rankdir: "LR",
        ranksep: 0.05,
        nodesep: 0.2,
        concentrate: false,
        splines: true,
        packmode: "array",
        truecolor: true,
        bgcolor: "#00000000",
        pad: 0,
      },
    },
    {
      target: "edge",
      props: {
        fontname: SepFontInfo.name,
        tailclip: false,
        arrowsize: 0.5,
        minlen: 3,
      },
    },
    {
      target: "node",
      props: {
        shape: "plaintext",
        margin: 0.05,
        fontsize: SepFontInfo.size,
        fontname: SepFontInfo.name,
      },
    },
  ];

  return [...props, ...nodes, ...edges];
}

function graphvizRenderText(components) {
  const mapDict = (attrs, fn) =>
    Object.entries(attrs)
      .filter((v) => v[1] !== null)
      .map(fn);

  const renderAttr = ([k, v]) => (v === null ? `` : ` ${k}="${v}"`);

  const renderAttrs = (attrs) => mapDict(attrs, renderAttr).join("");

  const renderXml = (xml) => {
    if (xml instanceof XMLElement) {
      return [
        `<${xml.tag}${renderAttrs(xml.attrs)}>`,
        ...xml.children.map(renderXml),
        `</${xml.tag}>`,
      ].join("");
    } else if (xml instanceof XMLContainer) {
      return xml.children.map(renderXml).join("");
    } else {
      return xml;
    }
  };

  const renderProp = ([k, v]) =>
    k == "label" ? `${k}=<${renderXml(v)}>` : `${k}="${v}"`;

  const renderProps = (props = {}) =>
    "[" + mapDict(props, renderProp).join(", ") + "]";

  const renderExtremity = (path) => path.map((a) => `"${a}"`).join(":");

  const renderOne = (obj) => {
    if ("target" in obj) return `${obj.target} ${renderProps(obj.props)}`;
    else if ("name" in obj) return `"${obj.name}" ${renderProps(obj.props)}`;
    else if ("src" in obj)
      return `${renderExtremity(obj.src)} -> ${renderExtremity(obj.dst)} ${renderProps(obj.props)}`;
    console.error("Unrecognized GraphViz construct:", obj);
    return "";
  };

  return ["digraph {", ...components.map(renderOne), "}"].join("\n");
}

const lastVid = {};
const dots = {};

function renderHeapObjectsInOneDiagram(objects, vid) {
  const diagramComponents = graphvizDiagramComponents(objects);
  const dot = graphvizRenderText(diagramComponents);
  const dotNode = createElement("div", ["sep-diagram-dot"], {
    text: dot,
    attrs: null,
  });
  dots[vid] = dot;
  const svgNode = createElement("div", ["sep-diagram-svg"]);

  // Call `dot` then `render` instead of `renderDot` to do the computational
  // intensive layout stages for graphs before doing the potentially
  // synchronized rendering of all the graphs simultaneously.
  d3.select(svgNode)
    .graphviz({ fit: false, useWorker: false, zoom: true })
    .dot(dot)
    .render();
  return { svgNode, dotNode };
}

// Render parsed unit of Rocq goal that has an embeded diagram.
// A sep-visualization node has two views:
// 1. source-code view
// 2. diagram view: pure predicates + diagram (svg or dot)
function renderGoalParseUnit(host, parseUnit) {
  const srcView = createElement("div", ["sep-source"], {
    text: parseUnit.raw,
    attrs: null,
  });
  const diagramView = createElement("div", ["sep-diagram"]);
  const purePredsNode = parseUnit.purePredicates.length
    ? renderPurePredicates(parseUnit.purePredicates)
    : null;
  const { svgNode, dotNode } = renderHeapObjectsInOneDiagram(
    parseUnit.objects,
    host.id,
  );

  function hide(node) {
    node.classList.add("hidden");
  }

  function show(node) {
    node.classList.remove("hidden");
  }

  // default
  diagramView.replaceChildren(
    ...[purePredsNode, dotNode, svgNode].filter(Boolean),
  );
  hide(dotNode);
  host.replaceChildren(diagramView);

  // interaction
  // TODO: revise
  srcView.onclick = () => {
    host.replaceChildren(diagramView);
  };
  if (purePredsNode)
    purePredsNode.onclick = () => {
      host.replaceChildren(srcView);
    };
  svgNode.onclick = () => {
    show(dotNode);
    hide(svgNode);
  };
  dotNode.onclick = () => {
    show(svgNode);
    hide(dotNode);
    host.replaceChildren(srcView);
  };
}

// const goalClasses = ["goal-conclusion", "coq-message", "goal-hyp"];
function renderEmbedded() {
  let genVid = 0,
    lastPreVid = null,
    lastPostVid = null;

  function next(isPre) {
    const vid = `vid${genVid++}`;
    lastVid[vid] = isPre ? lastPreVid : lastPostVid;
    if (isPre) lastPreVid = vid;
    else lastPostVid = vid;
    return vid;
  }

  document.querySelectorAll(".goal-conclusion").forEach((goalNode) => {
    const parseResult = parse(goalNode.innerText);
    goalNode.innerText = "";
    let isPre = true;
    parseResult.forEach((parseUnit, parseUnitIdx) => {
      if (typeof parseUnit === "object" && "raw" in parseUnit) {
        const vid = next(isPre);
        const host = createElement("div", ["sep-visualization"], {
          text: null,
          attrs: { id: vid },
        });
        goalNode.append(host);
        renderGoalParseUnit(host, parseUnit);
        isPre = false;
      } else {
        goalNode.append(parseUnit);
      }
    });
  });
}

const transitionFactory = () => {
  return d3.transition().duration(5000).ease(d3.easeCubicInOut);
};

const renderingVids = new Set();

async function animate(vizNode, duration = 2000) {
  const vid = vizNode.id;
  if (renderingVids.has(vid)) return;
  const last = lastVid[vid];
  if (!last) return;

  const svgNode = vizNode.querySelector(".sep-diagram-svg");
  const gviz = svgNode.__graphviz__;

  renderingVids.add(vid);

  // render the previous diagram
  await new Promise((resolve) => {
    gviz
      .transition(function () {
        return d3.transition().duration(0);
      })
      .renderDot(dots[last])
      .on("end", resolve);
  });
  // transit to the current diagram
  await new Promise((resolve) => {
    gviz
      .transition(function () {
        return d3.transition().duration(duration).ease(d3.easeCubicInOut);
      })
      .renderDot(dots[vid])
      .on("end", resolve);
  });

  renderingVids.delete(vid);
}

function observeAlectryonTarget() {
  function animateDiagramsInSentence(sentenceNode) {
    sentenceNode.querySelectorAll(".sep-visualization").forEach((vizNode) => {
      animate(vizNode);
    });
  }

  const observer = new MutationObserver((mutations) => {
    mutations
      .filter(
        (m) =>
          m.type === "attributes" &&
          m.attributeName === "class" &&
          m.target.classList.contains("alectryon-target"),
      )
      .forEach((m) => animateDiagramsInSentence(m.target));
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
    subtree: true,
  });
}

function init() {
  renderEmbedded();
  observeAlectryonTarget();
}

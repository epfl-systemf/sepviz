import * as SepParser from "./parser.js";
("use strict");

document.addEventListener("DOMContentLoaded", init);

async function loadRenderConfig() {
  const response = await fetch("./render_config.yml");
  if (!response.ok)
    throw new Error(`Failed to load config: ${response.status}`);
  const config = jsyaml.load(await response.text());
  return config;
}

function resolveSymbols(hpred) {
  let objects = [];
  let purePredicates = [];
  let gensym = {};

  function next(prefix) {
    if (!(prefix in gensym)) gensym[prefix] = 0;
    return gensym[prefix]++;
  }

  function resolve(ctx, key, ifAbsent) {
    let value = ctx.get(key);
    if (value !== undefined) {
      return value;
    } else if (ifAbsent !== undefined) {
      return ifAbsent;
    } else {
      return {global: true, uid: key, label: key};
    };
  }

  function loop(hpred, ctx) {
    switch (hpred.kind) {
      case "stars":
        hpred.conjuncts.forEach((c) => loop(c, ctx));
        break;
      case "existential":
        const num = next(hpred.binder);
        ctx.set(hpred.binder, {
          global: false,
          uid: hpred.binder + "$" + num,
          label: `?${hpred.binder}${num}`, // ['font', {}, `?${hpred.binder}`, ['sub', {}, `${num}`]]
        });
        loop(hpred.body, ctx);
        break;
      case "pointsTo":
        const addr = resolve(ctx, hpred.from);
        const [constr, ...args] = hpred.to;
        objects.push({
          addr,
          constr,
          args: args.map((a) => resolve(ctx, a)),
        });
        break;
      case "gc":
        break;
      case "purePredicate":
        purePredicates.push(hpred.predicate.map((x) => resolve(ctx, x, x)));
        break;
      default:
        throw new Error("Not supported kind: ${hpred.kind}");
    }
  }

  loop(hpred, new Map());
  return { objects: objects, purePredicates: purePredicates };
}

// Create DOM element with class and optional text/attrs.
function createElement(tag, classList = [], { text, id } = {}) {
  const node = document.createElement(tag);
  classList.forEach((c) => node.classList.add(c));
  if (text) node.append(document.createTextNode(text));
  if (id) node.setAttribute("id", id);
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
  const argsConfig = renderConfig.constr[obj.constr].args;

  return obj.args
    .map((arg, argIdx) => {
      const config = argsConfig[argIdx];
      const dstUid = arg.uid;
      const dstInPort = inPortOfUid[dstUid] || [];
      return knownUids.has(dstUid) || config.isPointer // This field is a pointer
        ? new GraphvizEdge(
            [srcUid, ...config.outPorts, ...[config.inTable ? "c" : "e"]],
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
  const constrConfig = renderConfig.constr;
  if (!(constr in constrConfig)) {
    console.error("Unrecognized structure:", constr);
    return [];
  }
  return constrConfig[constr].inPorts;
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
      : font({ color: renderConfig.font.existVarColor }, v.label);
  };

  const header = tr(
    {},
    td(
      { colspan: 2, cellpadding: 0, sides: "b" },
      box({}, row(label(obj.addr), ": ", obj.constr)),
    ),
  );

  const value = (port, v) =>
    tr(
      {},
      td({ port: port, sides: "tlb" }, label(v)),
      td({ sides: "trb" }, ""),
    );

  const pointer = (inPort, outPort, ptr) =>
    tr(
      {},
      td({ port: inPort, sides: "tlb" }, label(ptr)),
      td({ port: outPort, sides: "trb" }, "⏺"),
    );

  const objConfig = renderConfig.constr[obj.constr];
  return table(
    {
      cellborder: objConfig.isFlat ? 1 : 0,
    },
    header,
    ...obj.args
      .map((arg, argIdx) => {
        const config = objConfig.args[argIdx];
        return config.inTable
          ? knownUids.has(arg.uid)
            ? pointer(config.inPorts[0], config.outPorts[0], arg)
            : value(config.inPorts, arg)
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
  const props = ["graph", "edge", "node"].map((target) => ({
    target,
    props: renderConfig[target],
  }));

  // Try to have canonical order
  let nodesEdges = nodes.concat(edges).sort((x1, x2) =>
    (x1.name || x1.src.join("") + x1.dst.join("")) < (x2.name || x2.src.join("") + x2.dst.join("")));
  return [...props, ...nodesEdges];
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

function renderHeapObjectsInOneDiagram(objects, vid) {
  const diagramComponents = graphvizDiagramComponents(objects);
  const dot = graphvizRenderText(diagramComponents);
  const dotNode = createElement("div", ["sep-diagram-dot"], {text: dot});
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
  const srcView = createElement("div", ["sep-source"], {text: parseUnit.raw});
  const diagramView = createElement("div", ["sep-diagram"]);
  const purePredsNode = parseUnit.purePredicates.length
    ? renderPurePredicates(parseUnit.purePredicates)
    : null;
  const { svgNode, dotNode } = renderHeapObjectsInOneDiagram(
    parseUnit.objects,
    host.id,
  );

  const hide = (node) => node.classList.add("hidden");
  const show = (node) => node.classList.remove("hidden");

  // default
  host.append(srcView, diagramView);
  diagramView.append(...[purePredsNode, dotNode, svgNode].filter(Boolean));
  hide(srcView);
  hide(dotNode);

  // interaction
  const toggleSrcView = () => {
    show(srcView);
    hide(diagramView);
  };
  const toggleDiagramView = () => {
    hide(srcView);
    show(diagramView);
  };
  const toggleSvg = () => {
    show(svgNode);
    hide(dotNode);
  };
  const toggleDot = () => {
    hide(svgNode);
    show(dotNode);
  };
  function onSpecialClick(elem, callback) {
    elem.addEventListener('click', (e) => {
      if (e.ctrlKey) {
        callback();
      }
    });
  }
  onSpecialClick(srcView, toggleDiagramView);
  if (purePredsNode) onSpecialClick(purePredsNode, toggleSrcView);
  onSpecialClick(svgNode, toggleDot);
  onSpecialClick(dotNode, () => {
    toggleSvg();
    toggleSrcView();
  });
}

// TODO: besides "goal-conclusion", handle classes "coq-message" and "goal-hyp" as well.
function renderEmbedded() {
  const previousVids = {};
  let latestVids = {pre: 0, post: 0, default: 0};

  function vidOf(number, stream) { return `vid-${stream}-${number}`; }

  function nextVid(isResetGoal, stream) {
    const latest = latestVids[stream];
    const vid = vidOf(++latestVids[stream], stream);
    if (!isResetGoal) previousVids[vid] = vidOf(latest, stream);
    return vid;
  }

  document
    .querySelectorAll(".alectryon-sentence:has(.goal-conclusion)")
    .forEach((sentenceNode) => {
      const goalNode = sentenceNode.querySelector(".goal-conclusion");
      const parseResult = SepParser.parse(goalNode.innerText)
        .map((t) => (typeof t == "object")? { ...t, ...resolveSymbols(t.parsed) }: t);
      goalNode.innerText = "";
      parseResult.forEach((parseUnit) => {
        if (typeof parseUnit === "object") {
          const vid = nextVid(sentenceNode.goalReset, parseUnit.position);
          const host = createElement("div", ["sep-visualization"], {id: vid});
          goalNode.append(host);
          renderGoalParseUnit(host, parseUnit);
        } else { // unparsed string
          goalNode.append(parseUnit);
        }
      });
    });

  return previousVids;
}

// Use a MutationObserver to watch the target and animate its transitions.
function animateAlectryonTarget(previousVids) {
  const renderingVids = new Set();

  function getDotByVid(vid) {
    const node = document.querySelector(`#${vid} .sep-diagram-dot`);
    if (!node) console.log(vid);
    return node.innerText;
  }

  async function animate(vizNode, duration = 2000) {
    const vid = vizNode.id;
    if (renderingVids.has(vid)) return;
    const previous = previousVids[vid];
    if (!previous) return;

    const svgNode = vizNode.querySelector(".sep-diagram-svg");
    const gviz = svgNode.__graphviz__;
    const dotNode = vizNode.querySelector(".sep-diagram-dot");
    const dot = dotNode.innerText;

    renderingVids.add(vid);
    // render the previous diagram
    await new Promise((resolve) => {
      gviz
        .transition(function () {
          return d3.transition().duration(0);
        })
        .renderDot(getDotByVid(previous))
        .on("end", resolve);
    });
    // transit to the current diagram
    await new Promise((resolve) => {
      gviz
        .transition(function () {
          return d3.transition().duration(duration).ease(d3.easeCubicInOut);
        })
        .renderDot(dot)
        .on("end", resolve);
    });
    renderingVids.delete(vid);
  }

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

function markGoalResets() {
  const resetKeywords = ["Goal", "Lemma", "Theorem", "Definition", "Example", "Corollary",
                         "-", "+", "*", "{", "}"];
  document.querySelectorAll(".alectryon-sentence").forEach((n) => {
    const firstText = n.querySelector(".alectryon-input").firstChild.textContent.trim();
    if (resetKeywords.includes(firstText)) n.goalReset = true;
  });
}

var renderConfig;
async function init() {
  markGoalResets();
  renderConfig = await loadRenderConfig();
  const previousVids = renderEmbedded();
  animateAlectryonTarget(previousVids);
}

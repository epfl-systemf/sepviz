import * as SepParser from "./parser.js";
("use strict");

document.addEventListener("DOMContentLoaded", init);

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

// Create element with class and optional text/attrs.
function createElement(tag, className, { text, attrs } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.append(document.createTextNode(text));
  if (attrs)
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Put all pure predicates in a box.
function renderPurePredicates(purePredicates) {
  const host = createElement("div", "sep-pure-predicate-container");
  purePredicates.forEach((predicate) => {
    let predicateNode = createElement("div", "sep-pure-predicate");
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

// https://github.com/mdaines/viz-js/wiki/Differences-between-Viz.js-2.x-and-3.x
let vizPromise;
function vizRender(src) {
  if (typeof vizPromise === "undefined") {
    vizPromise = Viz.instance();
  }
  return vizPromise.then((viz) => viz.renderSVGElement(src));
}

function renderHeapObjectsInOneDiagram(objects) {
  console.log("objects = ", objects);

  const diagram = null;
  const dot = "digraph { a -> b -> c; }";
  const svgNode = createElement("span", "sep-diagram-svg");
  const dotNode = createElement("span", "sep-diagram-dot", {
    text: dot,
    attrs: null,
  });
  vizRender(dot)
    .then((element) => svgNode.appendChild(element))
    .catch((error) => {
      console.error(error);
    });
  return { svgNode, dotNode };
}

function init() {
  document
    .querySelectorAll(".goal-conclusion, .coq-message, .goal-hyp")
    .forEach((goal) => {
      const parseResult = parse(goal.innerText);
      goal.innerText = "";
      // console.log("parseResult = ", parseResult);
      parseResult.forEach((parseUnit) => {
        if (typeof parseUnit === "object" && "raw" in parseUnit) {
          const host = createElement("span", "sep-visualization");
          goal.append(host);
          // A sep-visualization node has two views:
          // 1. source-code view
          const srcView = createElement("span", "sep-source", {
            text: parseUnit.raw,
            attrs: null,
          });
          // 2. diagram view: pure predicates + diagram (svg or dot)
          const diagramView = createElement("div", "sep-diagram");
          const purePredsNode = parseUnit.purePredicates.length
            ? renderPurePredicates(parseUnit.purePredicates)
            : null;
          const { svgNode, dotNode } = renderHeapObjectsInOneDiagram(
            parseUnit.objects,
          );

          // default
          diagramView.replaceChildren(
            ...[purePredsNode, svgNode].filter(Boolean),
          );
          host.replaceChildren(diagramView);

          // interaction
          srcView.onclick = () => {
            host.replaceChildren(diagramView);
          };
          if (purePredsNode)
            purePredsNode.onclick = () => {
              host.replaceChildren(srcView);
            };
          svgNode.onclick = () => {
            diagramView.replaceChild(dotNode, svgNode);
          };
          dotNode.onclick = () => {
            diagramView.replaceChild(svgNode, dotNode);
            host.replaceChildren(srcView);
          };
        } else {
          goal.append(parseUnit);
        }
      });
    });
}

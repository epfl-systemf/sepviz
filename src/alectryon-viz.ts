import './assets/sep.css';

import { createElement } from './utility';

import {
  loadRenderConfig,
  ResetKeywords,
  RenderConfig,
  GraphvizOptions,
} from './config';

import {
  parse,
  HeapState,
  PurePredicate,
  Symbol,
  DotBuilder,
  NodeOrder,
  StarHeapPred,
  HeapObject,
  OtherHeapPred,
  OtherHeapPredKind,
} from './viz';

// @ts:ignore
import * as d3 from 'd3';
// @ts:ignore
import 'd3-graphviz';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  markGoalResets();
  const config = await loadRenderConfig();
  const previousVids = renderEmbedded(config);
  setupAnimation();
}

// Extended HTML elements.
type ExtHTMLElement = HTMLElement & { goalReset?: boolean };

function markGoalResets() {
  document
    .querySelectorAll<HTMLElement>('.alectryon-sentence')
    .forEach((n: HTMLElement) => {
      const input = n.querySelector<HTMLElement>('.alectryon-input');
      const firstText = input?.firstChild?.textContent?.trim();
      if (firstText && ResetKeywords.includes(firstText))
        (n as ExtHTMLElement).goalReset = true;
    });
}

type Vid = string;

const Positions = ['pre', 'post', 'default']; // TODO: use enum instead

function renderEmbedded(config: RenderConfig): Record<Vid, Vid> {
  const previousVids: Record<Vid, Vid> = {};
  const nodeOrders: Record<Vid, NodeOrder | null> = {};
  const latestVids: Record<string, number> = Object.fromEntries(
    Positions.map((pos) => [pos, 0])
  );

  function vidOf(n: number, stream: string): Vid {
    return `vid-${stream}-${n}`;
  }

  function nextVid(isResetGoal: boolean | undefined, stream: string): Vid {
    const latest = latestVids[stream];
    const vid = vidOf(++latestVids[stream], stream);
    if (!isResetGoal && latest !== 0) previousVids[vid] = vidOf(latest, stream);
    return vid;
  }

  const render = new Render(config, nodeOrders, previousVids);

  // TODO: handle classes "coq-message" and "goal-hyp" as well.
  document
    .querySelectorAll<ExtHTMLElement>(
      '.alectryon-sentence:has(.goal-conclusion)'
    )
    .forEach((sentenceNode) => {
      sentenceNode
        .querySelectorAll<HTMLElement>('.goal-conclusion')
        .forEach((goalNode, idx) => {
          const parseResult = parse(goalNode.innerText, config);
          goalNode.innerText = '';
          parseResult.forEach((unit: HeapState | string) => {
            if (typeof unit === 'string') {
              goalNode.append(unit);
            } else {
              const host = createElement('div', [
                'sep-visualization',
                `sep-${unit.position}`,
              ]);
              if (idx === 0) {
                // Only animate the first goal.
                host.id = nextVid(sentenceNode.goalReset, unit.position);
              }
              goalNode.append(host);
              render.renderHeapState(unit, host);
            }
          });
        });
    });

  return previousVids;
}

class Render {
  private readonly config: RenderConfig;
  private readonly nodeOrders: Record<Vid, NodeOrder | null>;
  private readonly previousVids: Record<Vid, Vid>;

  constructor(
    config: RenderConfig,
    nodeOrders: Record<Vid, NodeOrder | null>,
    previousVids: Record<Vid, Vid>
  ) {
    this.config = config;
    this.nodeOrders = nodeOrders;
    this.previousVids = previousVids;
  }

  private hide(node: HTMLElement) {
    node.classList.add('hidden');
  }

  private show(node: HTMLElement) {
    node.classList.remove('hidden');
  }

  private toggle(toShow: HTMLElement, toHide: HTMLElement) {
    this.show(toShow);
    this.hide(toHide);
  }

  public renderHeapState(state: HeapState, host: HTMLElement) {
    const vid = host.id;
    const previousVid = this.previousVids[vid];
    const previousNodeOrder = previousVid ? this.nodeOrders[previousVid] : null;

    const srcView = createElement('div', ['sep-source'], { text: state.raw });
    const dgmView = createElement('div', ['sep-diagram']);
    host.append(dgmView, srcView);
    this.hide(srcView); // default: diagram view
    srcView.addEventListener('click', () => this.toggle(dgmView, srcView));

    const srcButton = createElement('button', ['src-button'], {
      text: 'formula',
    });
    srcButton.addEventListener('click', () => this.toggle(srcView, dgmView));

    dgmView.append(
      srcButton,
      this.renderStarHeapPred(state.pred, vid, previousNodeOrder)
    );
  }

  protected renderStarHeapPred(
    pred: StarHeapPred,
    vid: Vid,
    previousNodeOrder: NodeOrder | null
  ) {
    const host = createElement('div', ['sep-star-pred-container']);
    if (pred.purePreds.length > 0) {
      host.append(this.renderPurePreds(pred.purePreds));
    }
    if (pred.heapObjs.length > 0) {
      host.append(this.renderHeapObjs(pred.heapObjs, vid, previousNodeOrder));
    }
    pred.otherHeapPreds.forEach((otherPred) => {
      host.append(this.renderOtherHeapPred(otherPred));
    });
    return host;
  }

  protected renderPurePreds(purePreds: PurePredicate[]): HTMLElement {
    const host = createElement('div', ['sep-pure-pred-container']);
    purePreds.forEach((purePred: PurePredicate) => {
      let purePredNode = createElement('div', ['sep-pure-pred']);
      purePred.forEach((unit: Symbol | string, index: number) => {
        if (index != 0) purePredNode.appendChild(document.createTextNode(' '));
        const node =
          typeof unit === 'string'
            ? createElement('span', [], { text: unit })
            : createElement('span', ['sep-exist-var'], {
                text: (unit as Symbol).label,
              });
        purePredNode.appendChild(node);
      });
      host.appendChild(purePredNode);
    });
    return host;
  }

  protected renderHeapObjs(
    heapObjs: HeapObject[],
    vid: Vid,
    previousNodeOrder: NodeOrder | null
  ) {
    const host = createElement('div', ['sep-heap-obj-container']);
    const dotNode = createElement('div', ['sep-dot']);
    const svgNode = createElement('div', ['sep-svg']);
    host.append(dotNode, svgNode);
    this.hide(dotNode); // default: svg

    const dotBuilder = new DotBuilder(this.config, heapObjs, previousNodeOrder);
    const dot = dotBuilder.dot;
    this.nodeOrders[vid] = dotBuilder.nodeOrder;

    const dotCopy = createElement('button', ['copy-button'], { text: 'Copy' });
    const dotContent = createElement('div', ['content'], { text: dot });
    dotNode.append(dotCopy, dotContent);

    // Call `dot` then `render` instead of `renderDot` to do the computational
    // intensive layout stages for graphs before doing the potentially
    // synchronized rendering of all the graphs simultaneously.
    d3.select(svgNode).graphviz(GraphvizOptions).dot(dot).render();

    svgNode.addEventListener('click', () => {
      navigator.clipboard
        .writeText(dotContent.textContent)
        .then(() => {
          const tooltip = createElement('div', ['tooltip-copied'], {
            text: 'DOT source copied',
          });
          const rect = svgNode.getBoundingClientRect();
          tooltip.style.left = `${rect.left + window.scrollX}px`;
          tooltip.style.top = `${rect.top + window.scrollY - 20}px`;

          document.body.appendChild(tooltip);

          requestAnimationFrame(() => (tooltip.style.opacity = '1')); // fade in

          setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.addEventListener('transitionend', () => tooltip.remove());
          }, 1000); // fade out after 1s
        })
        .catch((err) => console.error('Copy failed', err));
    });
    return host;
  }

  protected renderOtherHeapPred(otherPred: OtherHeapPred) {
    const host = createElement('div', ['sep-other-pred-container']);
    const predNodes = otherPred.preds.map((pred) =>
      this.renderStarHeapPred(pred, 'vid-none', null)
    ); // FIXME: vid, previousNodeOrder
    const op = createElement('div', ['sep-op'], { text: otherPred.op });
    switch (otherPred.kind) {
      case OtherHeapPredKind.Wand:
        host.append(predNodes[0], op, predNodes[1]);
        predNodes[0].classList.add('sep-wand-hyp');
        break;
      case OtherHeapPredKind.Conj:
        host.append(predNodes[0], op, predNodes[1]);
        break;
      case OtherHeapPredKind.Disj:
        host.append(predNodes[0], op, predNodes[1]);
        break;
      case OtherHeapPredKind.Modality:
        host.append(op, predNodes[0]);
        break;
      case OtherHeapPredKind.Abstract:
        host.append(op);
        break;
      case OtherHeapPredKind.IfThenElse:
        host.append(
          createElement('span', ['sep-keyword'], { text: 'if' }),
          createElement('span', ['sep-pure-pred'], { text: otherPred.op }),
          createElement('span', ['sep-keyword'], { text: 'then' }),
          predNodes[0],
          createElement('span', ['sep-keyword'], { text: 'else' }),
          predNodes[1]
        );
        break;
      case OtherHeapPredKind.BigOp:
        const box = createElement('div', ['sep-bigop-box']);
        const left = createElement('div', ['sep-bigop-left']);
        const star = createElement('div', ['sep-bigop-op'], { text: otherPred.op });
        const binder = createElement('div', ['sep-bigop-binder']);
        binder.textContent = otherPred.binder.join(" ");
        left.append(star, binder);
        box.append(left, predNodes[0]);
        host.append(box);
        break;
    }
    return host;
  }
}

interface GraphvizInstance {
  transition(
    factory: () => d3.Transition<any, any, any, any>
  ): GraphvizInstance;
  renderDot(dot: string): GraphvizInstance;
  on(event: 'end', cb: () => void): GraphvizInstance;
}

type SVGElement = HTMLElement & { __graphviz__?: GraphvizInstance };

/**
 * Observe Alectryon targets; when a sentence becomes an `.alectryon-target`,
 * animate its `.sep-visualization` diagrams from the previous to the current.
 */
function setupAnimation(defaultDuration = 2000): void {
  const renderingVids = new Set<Vid>();

  function getDot(vizNode: HTMLElement): string | undefined {
    return vizNode.querySelector<HTMLElement>('.sep-dot .content')?.innerText;
  }

  async function animate(
    vizNode: HTMLElement,
    prevVizNode: HTMLElement,
    duration = defaultDuration
  ) {
    const vid = vizNode.id;
    if (!vid || renderingVids.has(vid)) return;

    const svgNode = vizNode.querySelector<SVGElement>('.sep-svg');
    const gviz = svgNode?.__graphviz__;

    const dot = getDot(vizNode);
    const prevDot = getDot(prevVizNode);

    if (!svgNode || !gviz || !dot || !prevDot || prevDot === dot) return;

    renderingVids.add(vid);
    // render the previous diagram instantly
    await new Promise<void>((resolve) => {
      gviz
        .transition(() => d3.transition().duration(0))
        .renderDot(prevDot)
        .on('end', resolve);
    });

    // transition to the current diagram
    await new Promise<void>((resolve) => {
      gviz
        .transition(() =>
          d3.transition().duration(duration).ease(d3.easeCubicInOut)
        )
        .renderDot(dot)
        .on('end', resolve);
    });

    renderingVids.delete(vid);
  }

  function animateDiagramsInSentence(
    sentNode: HTMLElement,
    prevSentNode: HTMLElement
  ) {
    function getVizNode(
      sentNode: HTMLElement,
      pos: string
    ): HTMLElement | null {
      return sentNode.querySelector<HTMLElement>(
        `.sep-visualization.sep-${pos}`
      );
    }

    Positions.forEach((pos) => {
      if (pos === 'default') return;
      const vizNode = getVizNode(sentNode, pos);
      if (!vizNode) return;
      const prevVizNode = getVizNode(prevSentNode, pos);
      if (!prevVizNode) return;
      animate(vizNode, prevVizNode);
    });
  }

  let prevSentNode: HTMLElement | null = null;

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (
        m.type === 'attributes' &&
        m.attributeName === 'class' &&
        m.target instanceof HTMLElement &&
        m.target.classList.contains('alectryon-target')
      ) {
        if (prevSentNode) animateDiagramsInSentence(m.target, prevSentNode);
        prevSentNode = m.target;
      }
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
  });
}

// For testing
import { parse as peggyParse } from './parser';
export function testParsing(text: string) {
  console.log('parse input = ', text);
  const res = peggyParse(text);
  console.log('parse result = ', res);
}

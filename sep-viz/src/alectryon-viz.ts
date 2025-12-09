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
  setupAnimation(previousVids);
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

function renderEmbedded(config: RenderConfig): Record<Vid, Vid> {
  const previousVids: Record<Vid, Vid> = {};
  const nodeOrders: Record<Vid, NodeOrder | null> = {};
  const latestVids: Record<string, number> = { pre: 0, post: 0, default: 0 };

  function vidOf(n: number, stream: string): Vid {
    return `vid-${stream}-${n}`;
  }

  function nextVid(isResetGoal: boolean | undefined, stream: string): Vid {
    const latest = latestVids[stream];
    const vid = vidOf(++latestVids[stream], stream);
    if (!isResetGoal && latest !== 0) previousVids[vid] = vidOf(latest, stream);
    return vid;
  }

  // TODO: handle classes "coq-message" and "goal-hyp" as well.
  document
    .querySelectorAll<ExtHTMLElement>(
      '.alectryon-sentence:has(.goal-conclusion)'
    )
    .forEach((sentenceNode) => {
      sentenceNode
        .querySelectorAll<HTMLElement>('.goal-conclusion')
        .forEach((goalNode, idx) => {
          const parseResult = parse(goalNode.innerText);
          goalNode.innerText = '';
          parseResult.forEach((unit: HeapState | string) => {
            if (typeof unit === 'string') {
              goalNode.append(unit);
            } else {
              const host = createElement('div', ['sep-visualization']);
              if (idx === 0) {
                // Only animate the first goal.
                host.id = nextVid(sentenceNode.goalReset, unit.position);
              }
              goalNode.append(host);
              renderHeapState(config, host, unit, nodeOrders, previousVids);
            }
          });
        });
    });

  return previousVids;
}

// Render a heap state as a sep-visualization node (`host`) that has two views:
// 1. source-code view
// 2. diagram view: pure predicates + diagram (svg or dot)
function renderHeapState(
  config: RenderConfig,
  host: HTMLElement,
  state: HeapState,
  nodeOrders: Record<Vid, NodeOrder | null>,
  previousVids: Record<Vid, Vid>
) {
  const hide = (node: HTMLElement) => node.classList.add('hidden');
  const show = (node: HTMLElement) => node.classList.remove('hidden');
  const toggle = (toShow: HTMLElement, toHide: HTMLElement) => {
    show(toShow);
    hide(toHide);
  };

  const vid = host.id;
  const previousVid = previousVids[vid];

  const srcView = createElement('div', ['sep-source'], { text: state.raw });
  const diagramView = createElement('div', ['sep-diagram']);
  host.append(diagramView, srcView);
  hide(srcView); // default: diagram view
  srcView.addEventListener('click', () => toggle(diagramView, srcView));

  if (state.purePredicates.length > 0) {
    const purePredsNode = renderPurePredicates(state.purePredicates);
    diagramView.append(purePredsNode);
    purePredsNode.addEventListener('click', () => toggle(srcView, diagramView));
  }

  if (state.heapPredicates.length > 0) {
    const dotNode = createElement('div', ['sep-diagram-dot']);
    const dotCopy = createElement('button', ['copy-button'], { text: 'Copy' });
    const dotBuilder = new DotBuilder(
      config,
      state.heapPredicates,
      previousVid ? nodeOrders[previousVid] : null
    );
    nodeOrders[vid] = dotBuilder.nodeOrder;
    const dot = dotBuilder.dot;
    const dotContent = createElement('div', ['content'], { text: dot });
    dotNode.append(dotCopy, dotContent);

    const svgNode = createElement('div', ['sep-diagram-svg']);
    // Call `dot` then `render` instead of `renderDot` to do the computational
    // intensive layout stages for graphs before doing the potentially
    // synchronized rendering of all the graphs simultaneously.
    d3.select(svgNode).graphviz(GraphvizOptions).dot(dot).render();

    diagramView.append(svgNode, dotNode);
    hide(dotNode);

    svgNode.addEventListener('click', () => toggle(dotNode, svgNode));
    dotContent.addEventListener('click', () => {
      toggle(svgNode, dotNode);
      toggle(srcView, diagramView);
    });
    dotCopy.addEventListener('click', () => {
      navigator.clipboard
        .writeText(dotContent.textContent)
        .then(() => {
          dotCopy.textContent = 'Copied!';
          setTimeout(() => (dotCopy.textContent = 'Copy'), 800);
        })
        .catch((err) => console.error('Copy failed', err));
    });
  }
}

function renderPurePredicates(purePredicates: PurePredicate[]): HTMLElement {
  const host = createElement('div', ['sep-pure-predicate-container']);
  purePredicates.forEach((predicate: PurePredicate) => {
    let predicateNode = createElement('div', ['sep-pure-predicate']);
    predicate.forEach((unit: Symbol | string, index: number) => {
      if (index != 0) predicateNode.appendChild(document.createTextNode(' '));
      const node =
        typeof unit === 'string'
          ? createElement('span', [], { text: unit })
          : createElement('span', ['sep-exist-var'], {
              text: (unit as Symbol).label,
            });
      predicateNode.appendChild(node);
    });
    host.appendChild(predicateNode);
  });
  return host;
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
function setupAnimation(
  previousVids: Record<Vid, Vid>,
  defaultDuration = 2000
): void {
  const renderingVids = new Set<Vid>();

  function getDotByVid(vid: Vid): string | null {
    const node = document.querySelector<HTMLElement>(
      `#${vid} .sep-diagram-dot .content`
    );
    if (!node) {
      console.warn('Cannot find the dot content for vid: ', vid);
      return null;
    }
    return node.innerText;
  }

  async function animate(vizNode: HTMLElement, duration = defaultDuration) {
    const vid = vizNode.id as Vid;
    if (!vid || renderingVids.has(vid)) return;

    const previous = previousVids[vid];
    if (!previous) return;

    const svgNode = vizNode.querySelector<SVGElement>('.sep-diagram-svg');
    const dot = vizNode.querySelector<HTMLElement>(
      '.sep-diagram-dot .content'
    )?.innerText;
    const gviz = svgNode?.__graphviz__;
    const prevDot = getDotByVid(previous);

    if (!svgNode || !gviz || !dot || !prevDot) return;
    if (prevDot === dot) return;

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

  function animateDiagramsInSentence(sentenceNode: HTMLElement) {
    sentenceNode
      .querySelectorAll<HTMLElement>('.sep-visualization')
      .forEach((vizNode) => animate(vizNode));
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (
        m.type === 'attributes' &&
        m.attributeName === 'class' &&
        m.target instanceof HTMLElement &&
        m.target.classList.contains('alectryon-target')
      ) {
        animateDiagramsInSentence(m.target);
      }
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
  });
}

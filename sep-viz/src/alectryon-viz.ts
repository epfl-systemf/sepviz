import './assets/sep.css';

import {
  createElement,
  loadRenderConfig,
  resetKeywords,
  RenderConfig,
} from './utility';

import { parse, HeapState, PurePredicate, Symbol, DotBuilder } from './viz';

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
      if (firstText && resetKeywords.includes(firstText))
        (n as ExtHTMLElement).goalReset = true;
    });
}

type Vid = string;

function renderEmbedded(config: RenderConfig): Record<Vid, Vid> {
  const previousVids: Record<Vid, Vid> = {};
  let latestVids: Record<string, number> = { pre: 0, post: 0, default: 0 };

  function vidOf(n: number, stream: string): Vid {
    return `vid-${stream}-${n}`;
  }

  function nextVid(isResetGoal: boolean | undefined, stream: string): Vid {
    const latest = latestVids[stream];
    const vid = vidOf(++latestVids[stream], stream);
    if (!isResetGoal) previousVids[vid] = vidOf(latest, stream);
    return vid;
  }

  document
    .querySelectorAll<ExtHTMLElement>(
      '.alectryon-sentence:has(.goal-conclusion)'
    )
    .forEach((sentenceNode) => {
      const goalNode =
        sentenceNode.querySelector<HTMLElement>('.goal-conclusion');
      if (!goalNode) return;
      const parseResult = parse(goalNode.innerText);
      goalNode.innerText = '';
      parseResult.forEach((unit: HeapState | string) => {
        if (typeof unit === 'string') {
          goalNode.append(unit);
        } else {
          const vid = nextVid(sentenceNode.goalReset, unit.position);
          const host = createElement('div', ['sep-visualization'], { id: vid });
          goalNode.append(host);
          renderHeapState(config, host, unit);
        }
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
  state: HeapState
) {
  const srcView = createElement('div', ['sep-source'], { text: state.raw });
  const diagramView = createElement('div', ['sep-diagram']);
  const purePredsNode = renderPurePredicates(state.purePredicates);

  const dotNode = createElement('div', ['sep-diagram-dot']);
  const dotCopy = createElement('button', ['copy-button'], { text: 'Copy' });
  dotNode.append(dotCopy);
  const dot = new DotBuilder(config, state.heapPredicates).build();
  const dotContent = createElement('div', ['content'], { text: dot });
  dotNode.append(dotContent);

  const svgNode = createElement('div', ['sep-diagram-svg']);
  // Call `dot` then `render` instead of `renderDot` to do the computational
  // intensive layout stages for graphs before doing the potentially
  // synchronized rendering of all the graphs simultaneously.
  d3.select(svgNode)
    .graphviz({ fit: false, useWorker: false, zoom: true })
    .dot(dot)
    .render();

  const hide = (node: HTMLElement) => node.classList.add('hidden');
  const show = (node: HTMLElement) => node.classList.remove('hidden');

  // default
  host.append(srcView, diagramView);
  if (purePredsNode) diagramView.append(purePredsNode);
  diagramView.append(dotNode, svgNode);
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

  srcView.addEventListener('click', toggleDiagramView);
  if (purePredsNode) purePredsNode.addEventListener('click', toggleSrcView);
  svgNode.addEventListener('click', toggleDot);
  dotContent.addEventListener('click', () => {
    toggleSvg();
    toggleSrcView();
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

function renderPurePredicates(
  purePredicates: PurePredicate[]
): HTMLElement | null {
  if (purePredicates.length == 0) return null;
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

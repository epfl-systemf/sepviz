import './assets/sep.css'; // FIXME: move css out of assets?

import { loadRenderConfig, ResetKeywords, RenderConfig } from './config';
import { Render, ExtHTMLElement } from './render';

import * as d3 from 'd3';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('[init] started');
  markGoalResets();
  const config = await loadRenderConfig();
  renderEmbedded(config);
  setupAnimation();
}

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

function renderEmbedded(config: RenderConfig) {
  const render = new Render(config);

  // TODO: handle classes "coq-message" and "goal-hyp" as well.
  document
    .querySelectorAll<ExtHTMLElement>(
      '.alectryon-sentence:has(.goal-conclusion)'
    )
    .forEach((sentenceNode) => {
      sentenceNode
        .querySelectorAll<HTMLElement>('.goal-conclusion')
        .forEach((goalNode, idx) => {
          render.render(goalNode.innerText, goalNode, idx === 0); // Only animate the first hprop
        });
    });
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
    return vizNode.querySelector<ExtHTMLElement>('.sep-svg')?.dot;
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
      stream: string
    ): HTMLElement | null {
      return sentNode.querySelector<HTMLElement>(
        `.sep-visualization.sep-stream-${stream}`
      );
    }

    ['PRE', 'POST'].forEach((stream: string) => {
      const vizNode = getVizNode(sentNode, stream);
      if (!vizNode) return;
      const prevVizNode = getVizNode(prevSentNode, stream);
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

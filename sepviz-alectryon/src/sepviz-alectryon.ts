import { loadRenderConfig, ResetKeywords, RenderConfig } from 'sepviz';
import { Render, ExtHTMLElement } from 'sepviz';
import 'sepviz/sepviz.css';

import { transition } from 'd3-transition';
import { easeCubicInOut } from 'd3-ease';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  markGoalResets(); // FIXME: use it to break animation
  // Pass config path via URL query parameter, e.g., `?config=/path/to/config`
  const configPath =
    new URLSearchParams(window.location.search).get('config') ?? 'sepviz.yaml';
  const config = await loadRenderConfig(configPath);
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

  document
    .querySelectorAll<ExtHTMLElement>(
      '.alectryon-sentence:has(.hyp-type, .goal-conclusion, .alectryon-message)'
    )
    .forEach((sentenceNode) => {
      sentenceNode
        .querySelectorAll<HTMLElement>('.goal-conclusion')
        .forEach((goalNode, idx) => {
          render.render(
            goalNode.innerText,
            goalNode,
            idx === 0 // only animate the first hprop of conclusion
          );
        });
      sentenceNode
        .querySelectorAll<HTMLElement>('.hyp-type, .alectryon-message')
        .forEach((goalNode) => {
          goalNode.style.display = 'block';
          render.render(goalNode.innerText, goalNode, false);
        });
    });
}

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

    const svgNode = vizNode.querySelector<ExtHTMLElement>('.sep-svg');
    const gviz = svgNode?.__graphviz__;

    const dot = getDot(vizNode);
    const prevDot = getDot(prevVizNode);

    if (!svgNode || !gviz || !dot || !prevDot || prevDot === dot) return;

    renderingVids.add(vid);
    // render the previous diagram instantly
    await new Promise<void>((resolve) => {
      gviz
        .transition((() => transition().duration(0)) as any)
        .renderDot(prevDot)
        .on('end', resolve);
    });

    // transition to the current diagram
    await new Promise<void>((resolve) => {
      gviz
        .transition((() =>
          transition().duration(duration).ease(easeCubicInOut)) as any)
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
        `.goal-conclusion .sep-visualization.sep-stream-${stream}`
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

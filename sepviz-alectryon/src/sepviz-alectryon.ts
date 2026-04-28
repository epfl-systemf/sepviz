import { loadRenderConfig, ResetKeywords, RenderConfig } from 'sepviz';
import { Render, ExtHTMLElement } from 'sepviz';
import 'sepviz/sepviz.css';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  markGoalResets(); // FIXME: use it to break animation
  // Pass config path via URL query parameter, e.g., `?config=/path/to/config`
  const configPath =
    new URLSearchParams(window.location.search).get('config') ?? 'sepviz.yaml';
  const config = await loadRenderConfig(configPath);
  const render = new Render(config);
  renderEmbedded(render);
  setupAnimation(render);
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

function renderEmbedded(render: Render) {
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
function setupAnimation(render: Render): void {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (
        m.type === 'attributes' &&
        m.attributeName === 'class' &&
        m.target instanceof HTMLElement &&
        m.target.classList.contains('alectryon-target')
      ) {
        const node = m.target.querySelector<HTMLElement>('.goal-conclusion');
        if (node) render.animate(node);
      }
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
  });
}

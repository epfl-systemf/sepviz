import './assets/sep.css'; // FIXME: move css out of assets?

import { loadRenderConfig, ResetKeywords, RenderConfig } from './config';
import { assert, createElement } from './utility';
import * as AST from './parser';
import { DotBuilder } from './dot-builder';

import * as d3 from 'd3';
import { graphviz, KeyMode } from 'd3-graphviz';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('[init] started');
  markGoalResets();
  const config = await loadRenderConfig();
  renderEmbedded(config);
  setupAnimation();
}

/**
 * https://github.com/magjac/d3-graphviz?tab=readme-ov-file#graphviz_keyMode
 * Use 'keyMode: id' to ensure that d3-graphviz treats nodes or edges of the
 * same id as the same object in transitions.
 */
const GraphvizOptions = {
  fit: false,
  zoom: true,
  keyMode: 'id' as KeyMode,
  useWorker: false,
};

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

function renderEmbedded(config: RenderConfig) {
  const parser = new AST.Parser(config);
  const render = new Render(config);
  const counts: Record<string, number> = {};

  function next(stream: string): string {
    if (counts[stream] === undefined) counts[stream] = 0;
    counts[stream]++;
    return `vid-${stream}-${counts[stream]}`;
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
          const goal: AST.Goal = parser.parse(goalNode.innerText);
          goalNode.innerText = '';
          goal.forEach((seg) => {
            if (seg instanceof AST.HProp) {
              const stream = seg.ctx !== undefined ? seg.ctx : 'DEFAULT';
              const host = createElement('div', [
                'sep-visualization',
                `sep-stream-${stream}`, // FIXME
              ]);
              if (idx === 0) {
                // Only animate the first hprop
                host.id = next(stream);
              }
              goalNode.append(host);
              render.render(seg, host);
            } else {
              goalNode.append(seg); // string
            }
          });
        });
    });
}

class Render {
  constructor(private readonly config: RenderConfig) {}

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

  public render(hprop: AST.HProp, host: HTMLElement) {
    const srcView = createElement('div', ['sep-source'], { text: '' }); // FIXME: text = hprop.raw
    const dgmView = createElement('div', ['sep-diagram']);
    host.append(dgmView, srcView);
    this.hide(srcView); // default: diagram view
    srcView.addEventListener('click', () => this.toggle(dgmView, srcView));

    const srcButton = createElement('button', ['src-button'], {
      text: 'formula',
    });
    srcButton.addEventListener('click', () => this.toggle(srcView, dgmView));

    dgmView.append(srcButton, this.renderHProp(hprop));
  }

  protected renderHProp(x: AST.HProp): HTMLElement {
    switch (x.op) {
      case 'PointsTos': {
        assert(
          x.args.every((arg) => arg instanceof AST.HProp_PointsTo),
          'PointsTos: expected HProp_PointsTo[]'
        );
        return this.renderPointsTos(x.args as AST.HProp_PointsTo[]);
      }
      case 'Pures': {
        assert(
          x.args.every((arg) => arg instanceof AST.HProp),
          'Pures: expected HProp[]'
        );
        return this.renderPures(x.args as AST.HProp[]);
      }
      case 'Stars': {
        const host = createElement('div', []);
        host.append(...x.args.map((arg) => this.renderHPropArg(arg)));
        return host;
      }
      case 'Wand': {
        const host = createElement('div', ['sep-other-pred-container']); // FIXME: rename other-pred-container
        assert(
          x.args.length === 2,
          `Wand: expected 2 arguments, wand = ${JSON.stringify(x)}`
        );
        assert(
          x.args.every((arg) => arg instanceof AST.HProp),
          `Wand: expected HProp arguments`
        );
        const nodes = x.args.map((arg) => this.renderHPropArg(arg));
        const op = createElement('div', ['sep-op'], { text: '-∗' }); // FIXME: read from config
        host.append(nodes[0], op, nodes[1]);
        return host;
      }
      case 'Conjs': {
        // FIXME
        return createElement('span', []);
      }
      case 'Disjs': {
        // FIXME
        return createElement('span', []);
      }
      case 'BigSep': {
        // FIXME
        return createElement('span', []);
      }
      case 'IfThenElse': {
        // FIXME
        return createElement('span', []);
      }
      case 'Opaque': {
        // FIXME: check anything?
        const host = createElement('div', []);
        host.append(...x.args.map((arg) => this.renderHPropArg(arg)));
        return host;
      }
      default: {
        throw new Error(`unrecognized hprop ${x.op}: ${JSON.stringify(x)}`);
      }
    }
  }

  protected renderHPropArg(x: AST.HPropArg): HTMLElement {
    if (x instanceof AST.HProp) return this.renderHProp(x);
    const s = Array.isArray(x)
      ? x.map((t) => AST.termLabel(t as AST.Term)).join()
      : AST.termLabel(x as AST.Term);
    return createElement('span', [], { text: s });
  }

  protected renderPures(xs: AST.HProp[]): HTMLElement {
    const host = createElement('div', ['sep-pures-container']);
    xs.forEach((x) => {
      let pureNode = createElement('div', ['sep-pure']);
      x.args.forEach((t, idx) => {
        assert(AST.HPropArg_isTerm(t), `expected Term`);
        if (idx != 0) pureNode.appendChild(document.createTextNode(' '));
        const node = createElement('span', [], {
          text: AST.termLabel(t as AST.Term),
        });
        if (t instanceof AST.Symbol && !t.isGlobal)
          node.classList.add('sep-exist-var');
        pureNode.appendChild(node);
      });
      host.appendChild(pureNode);
    });
    return host;
  }

  protected renderPointsTos(pts: AST.HProp_PointsTo[]): HTMLElement {
    const host = createElement('div', ['sep-pointstos-container']);
    const dotNode = createElement('div', ['sep-dot']);
    this.hide(dotNode);
    const svgNode = createElement('div', ['sep-svg']);
    host.append(dotNode, svgNode);

    const dot = new DotBuilder(this.config, pts).dot;
    const dotCopy = createElement('button', ['copy-button'], { text: 'Copy' });
    const dotContent = createElement('div', ['content'], { text: dot });
    dotNode.append(dotCopy, dotContent);

    /**
     * Call `dot` then `render` instead of `renderDot` to do the computational
     * intensive layout stages for graphs before doing the potentially
     * synchronized rendering of all the graphs simultaneously.
     */
    graphviz(svgNode, GraphvizOptions).dot(dot).render();
    // d3.select(svgNode).graphviz(GraphvizOptions).dot(dot).render(); // FIXME: to delete

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
          // fade in
          requestAnimationFrame(() => (tooltip.style.opacity = '1'));
          // fade out after 1s
          setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.addEventListener('transitionend', () => tooltip.remove());
          }, 1000);
        })
        .catch((err) => console.error('Copy failed', err));
    });

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

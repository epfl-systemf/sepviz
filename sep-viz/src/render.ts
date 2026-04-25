import { RenderConfig } from './config';
import { assert, createElement } from './utility';
import * as AST from './parser';
import { DotBuilder } from './dot-builder';
import { graphviz, KeyMode, Graphviz } from 'd3-graphviz';
import { BaseType } from 'd3-selection';

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

export type ExtHTMLElement = HTMLElement & {
  __graphviz__?: Graphviz<BaseType, any, BaseType, any>;
  dot?: string;
  goalReset?: boolean;
};

export class Render {
  private readonly parser: AST.Parser;
  private counts: Record<string, number>;
  constructor(private readonly config: RenderConfig) {
    this.parser = new AST.Parser(config);
    this.counts = {};
  }

  private nextVid(stream: string): string {
    if (this.counts[stream] === undefined) this.counts[stream] = 0;
    this.counts[stream]++;
    return `vid-${stream}-${this.counts[stream]}`;
  }

  public render(
    goalText: string,
    goalNode: HTMLElement,
    animate: boolean
  ): void {
    const goal: AST.Goal = this.parser.parse(goalText);
    goalNode.innerText = '';
    goal.forEach((seg) => {
      if (seg instanceof AST.HProp) {
        const stream = seg.ctx !== undefined ? seg.ctx : 'DEFAULT';
        const host = createElement('div', [
          'sep-visualization',
          `sep-stream-${stream}`, // FIXME
        ]);
        if (animate) host.id = this.nextVid(stream);
        this.buildViews(seg, host);
        goalNode.append(host);
      } else {
        goalNode.append(createElement('span', [], { text: seg })); // string
      }
    });
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

  public buildViews(hprop: AST.HProp, host: HTMLElement) {
    const srcView = createElement('div', ['sep-source'], {
      text: hprop.raw,
    }) as ExtHTMLElement;
    const dgmView = createElement('div', ['sep-diagram']);
    host.append(dgmView, srcView);
    this.hide(srcView); // default: diagram view
    srcView.addEventListener('click', () => this.toggle(dgmView, srcView));

    const srcButton = createElement('button', ['src-button'], {
      text: '📝',
    });
    srcButton.addEventListener('click', () => this.toggle(srcView, dgmView));

    dgmView.append(srcButton, this.renderHProp(hprop));
  }

  protected renderHProp(x: AST.HProp): HTMLElement {
    switch (x.op) {
      case 'PointsTo': {
        return this.renderPointsTos([x as AST.HProp_PointsTo]);
      }
      case 'PointsTos': {
        assert(
          x.args.every((arg) => arg instanceof AST.HProp_PointsTo),
          'PointsTos: expected HProp_PointsTo[]'
        );
        return this.renderPointsTos(x.args as AST.HProp_PointsTo[]);
      }
      case 'Pure': {
        return this.renderPures([x]);
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
        const host = createElement('div', ['sep-pred-container']);
        assert(
          x.args.length >= 2,
          `Wand: expected 2 arguments in ${JSON.stringify(x)}`
        );
        const nodes = x.args.map((arg) => this.renderHPropArg(arg));
        const op = createElement('div', ['sep-op'], { text: '-∗' }); // FIXME: read from config
        host.append(nodes[0]!, op, nodes[1]!);
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
        assert(
          x.args.length >= 3,
          `IfThenElse: expected 3 arguments in ${JSON.stringify(x)}`
        );
        const host = createElement('div', ['sep-pred-container']);
        const nodes = x.args.map((arg) => this.renderHPropArg(arg));
        host.append(
          createElement('span', ['sep-keyword'], { text: 'If' }),
          nodes[0]!,
          createElement('span', ['sep-keyword'], { text: 'Then' }),
          nodes[1]!,
          createElement('span', ['sep-keyword'], { text: 'Else' }),
          nodes[2]!
        );
        return host;
      }
      case 'Opaque': {
        // FIXME: check anything?
        const host = createElement('div', []);
        host.append(...x.args.map((arg) => this.renderHPropArg(arg)));
        return host;
      }
      case 'Modality': {
        assert(
          x.args.length >= 2,
          `Modality: expected >= 2 arguments, got ${JSON.stringify(x)}`
        );
        const host = createElement('div', ['sep-pred-container']);
        assert(
          typeof x.args[0] === 'string',
          `Modality: 1st argument: expected a string, got ${JSON.stringify(x.args[1])}`
        );
        host.append(
          createElement('span', ['sep-op'], { text: x.args[0] as string }),
          ...x.args.slice(1).map((arg) => this.renderHPropArg(arg))
        );
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
      ? x.map((t) => AST.termLabel(t as AST.Term)).join('')
      : AST.termLabel(x as AST.Term);
    return createElement('span', [], { text: s });
  }

  protected renderPures(xs: AST.HProp[]): HTMLElement {
    const host = createElement('div', ['sep-pures-container']);
    xs.forEach((x) => {
      let pureNode = createElement('div', ['sep-pure']);
      x.args.forEach((t, idx) => {
        assert(
          !(t instanceof AST.HProp),
          `[render:renderPures] do not expect a HProp`
        );
        if (idx != 0) pureNode.appendChild(document.createTextNode(' '));
        const node = createElement('span', [], {
          text: Array.isArray(t)
            ? AST.termsLabel(t)
            : AST.termLabel(t as AST.Term),
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
    const svgNode = createElement('div', ['sep-svg']) as ExtHTMLElement;
    host.append(svgNode);

    const dot = new DotBuilder(this.config, pts).dot;
    svgNode.dot = dot;

    /**
     * Call `dot` then `render` instead of `renderDot` to do the computational
     * intensive layout stages for graphs before doing the potentially
     * synchronized rendering of all the graphs simultaneously.
     */
    const gviz = graphviz(svgNode, GraphvizOptions).dot(dot);
    svgNode.__graphviz__ = gviz;
    gviz.render();

    svgNode.addEventListener('click', () => {
      navigator.clipboard
        .writeText(svgNode.dot ? svgNode.dot : '')
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

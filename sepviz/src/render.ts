import { RenderConfig } from './config';
import { assert, createElement } from './utility';
import * as AST from './parser';
import { DotBuilder } from './dot-builder';
import { graphviz, KeyMode } from 'd3-graphviz';
import { Transition, transition } from 'd3-transition';
import { easeCubicInOut } from 'd3-ease';

/**
 * https://github.com/magjac/d3-graphviz?tab=readme-ov-file#graphviz_keyMode
 * Use 'keyMode: id' to ensure that d3-graphviz treats nodes or edges of the
 * same id as the same object in transitions.
 */
const GraphvizOptions = {
  fit: false,
  zoom: false,
  keyMode: 'id' as KeyMode,
  useWorker: false,
};

interface GraphvizInstance {
  transition(factory: () => Transition<any, any, any, any>): GraphvizInstance;
  renderDot(dot: string): GraphvizInstance;
  on(event: 'end', cb: () => void): GraphvizInstance;
}

export type ExtHTMLElement = HTMLElement & {
  __graphviz__?: GraphvizInstance;
  dot?: string;
  goalReset?: boolean;
};

export class Render {
  private readonly parser: AST.Parser;
  private counts: Record<string, number>;
  private rendering: Set<string>;
  private prevDots: Map<string, string | undefined>;
  constructor(private readonly config: RenderConfig) {
    this.parser = new AST.Parser(config);
    this.counts = {};
    this.rendering = new Set<string>();
    this.prevDots = new Map();
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
          `sep-stream-${stream}`,
        ]);
        if (animate) host.id = this.nextVid(stream);
        this.buildViews(seg, host);
        goalNode.append(host);
      } else {
        goalNode.append(createElement('span', [], { text: seg })); // string
      }
    });
  }

  public async animate(host: HTMLElement, duration = 2000) {
    ['PRE', 'POST'].forEach(async (stream) => {
      const vizNode = host.querySelector<HTMLElement>(
        `.sep-visualization.sep-stream-${stream}`
      );
      const prevDot = this.prevDots.get(stream);
      const svgNode = vizNode?.querySelector<ExtHTMLElement>('.sep-svg');
      const gviz = svgNode?.__graphviz__;
      const currDot = svgNode?.dot;
      this.prevDots.set(stream, currDot);

      if (!vizNode || !gviz || !currDot || !prevDot || prevDot === currDot)
        return;
      const vid = vizNode.id;
      if (!vid || this.rendering.has(vid)) return;

      this.rendering.add(vid);
      try {
        // render the previous diagram instantly
        await new Promise<void>((resolve) => {
          gviz
            .transition(() => transition().duration(0))
            .renderDot(prevDot)
            .on('end', resolve);
        });
        // transition to the current diagram
        await new Promise<void>((resolve) => {
          gviz
            .transition(() =>
              transition().duration(duration).ease(easeCubicInOut)
            )
            .renderDot(currDot)
            .on('end', resolve);
        });
      } finally {
        this.rendering.delete(vid);
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
        const host = createElement('div', ['vertial-stack']);
        host.append(
          ...x.args.map((arg) => {
            const node = this.renderHPropArg(arg);
            if (node.tagName === 'SPAN')
              return createElement('div', ['sep-pred-container'], {}, [node]);
            return node;
          })
        );
        return host;
      }
      case 'Wand': {
        const host = createElement('div', [
          'sep-pred-container',
          'horizontal-stack',
        ]);
        assert(
          x.args.length >= 2,
          `Wand: expected 2 arguments in ${JSON.stringify(x)}`
        );
        const nodes = x.args.slice(0, 2).map((arg) => this.renderHPropArg(arg));
        nodes[0]!.classList.add('sep-wand-hyp', 'vertial-stack');
        const op = createElement('div', ['sep-op'], { text: '-∗' });
        host.append(nodes[0]!, op, nodes[1]!);
        return host;
      }
      case 'Conjs':
      case 'Disjs': {
        const op = x.op === 'Conjs' ? '∧' : `∨`;
        const host = createElement('div', [
          'sep-pred-container',
          'vertial-stack',
        ]);
        const nodes = x.args.map((arg) => this.renderHPropArg(arg));
        host.append(
          ...nodes.map((node, idx) =>
            idx === 0
              ? node
              : createElement('div', ['horizontal-stack'], {}, [
                  createElement('span', ['sep-op'], { text: op }),
                  node,
                ])
          )
        );
        return host;
      }
      case 'BigOp': {
        const host = createElement('div', ['sep-pred-container']);
        assert(
          x.args.length >= 3,
          `BigOp: expected 3 arguments in ${JSON.stringify(x)}`
        );
        assert(
          typeof x.args[0] === 'string',
          `BigOp: 1st argument: expected a string, got ${x.args[0]}`
        );
        assert(
          !(x.args[1] instanceof AST.HProp),
          `BigOp: 2st argument: do not expected a HProp`
        );
        host.append(
          createElement('div', ['sep-bigop-box'], {}, [
            createElement('div', ['sep-bigop-left'], {}, [
              createElement('div', ['sep-bigop-op'], {
                text: x.args[0] as string,
              }),
              createElement('div', ['sep-bigop-binder'], {
                text: AST.termOrTermsLabel(x.args[1]!),
              }),
            ]),
            this.renderHPropArg(x.args[2]!),
          ])
        );
        return host;
      }
      case 'IfThenElse': {
        assert(
          x.args.length >= 3,
          `IfThenElse: expected 3 arguments, got ${JSON.stringify(x)}`
        );
        const host = createElement('div', ['sep-pred-container']);
        const nodes = x.args.slice(0, 3).map((arg) => this.renderHPropArg(arg));
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
        const host = createElement('div', ['sep-pred-container']);
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
      case 'Triple': {
        assert(
          x.args.length >= 3,
          `Triple: expected 3 arguments, got ${JSON.stringify(x)}`
        );
        const host = createElement('div', ['sep-pred-container', 'sep-triple']);
        const nodes = x.args.slice(0, 3).map((a) => {
          let arg =
            typeof a === 'string' ? a.trim().replaceAll(/\s+/g, ' ') : a; // fine tune
          return this.renderHPropArg(arg);
        });
        nodes[1]!.classList.add('vertical-stack');
        nodes[2]!.classList.add('vertical-stack');
        host.append(
          createElement('span', ['sep-keyword'], { text: 'Triple' }),
          nodes[0]!,
          createElement('span', ['sep-keyword'], { text: 'Pre:' }),
          nodes[1]!,
          createElement('span', ['sep-keyword'], { text: 'Post:' }),
          nodes[2]!
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

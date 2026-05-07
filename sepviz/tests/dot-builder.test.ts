import { DotBuilder, edgeToString } from '../src/dot-builder';
import { RenderConfig, defaultRenderConfig } from '../src/config';
import { HProp, HProp_PointsTo, Symbol, Value, Parser } from '../src/parser';
import { expect, test } from 'vitest';

const config: RenderConfig = {
  ...defaultRenderConfig(),
  constr: {
    TestConstr: {
      label: 'TestConstr',
      args: {},
      drawBorder: false,
      inPort: undefined,
    },
    $MCell: {
      label: 'MCell',
      args: {
        '0': {
          forceEdge: false,
          inPort: 'in$0',
          inTable: true,
          outPort: 'out$0',
        },
        '1': {
          forceEdge: false,
          inPort: 'in$1',
          inTable: true,
          outPort: 'out$1',
        },
      },
      drawBorder: true,
      inPort: 'in$0',
    },
    $MListSeg: {
      label: 'MListSeg',
      args: {
        '0': {
          forceEdge: true,
          inPort: 'in$0',
          inTable: false,
          outPort: 'list',
        },
        '1': {
          forceEdge: false,
          inPort: 'list',
          inTable: true,
          outPort: 'list',
        },
      },
      drawBorder: false,
      inPort: 'list',
    },
  },
};

test('pointsto example', () => {
  const pts = [
    new HProp_PointsTo('', new Symbol(true, 'p1', 'p1'), '$MCell', [
      'f1',
      'b1',
    ]),
    new HProp_PointsTo('', new Symbol(true, 'f2', 'f2'), '$MCell', ['x', 'c2']),
    new HProp_PointsTo('', new Symbol(true, 'c2', 'c2'), '$MListSeg', [
      'b2',
      "L2'",
    ]),
    new HProp_PointsTo('', new Symbol(true, 'p2', 'p2'), '$MCell', [
      'f2',
      'b2',
    ]),
    new HProp_PointsTo('', new Symbol(true, 'b2', 'b2'), '$MCell', [
      'd2',
      'null',
    ]),
    new HProp_PointsTo('', new Symbol(true, 'f1', 'f1'), '$MListSeg', [
      'b1',
      'L1',
    ]),
    new HProp_PointsTo('', new Symbol(true, 'b1', 'b1'), '$MCell', [
      'd1',
      'null',
    ]),
  ];
  const dotBuilder = new DotBuilder(config, pts);
  const clusters = dotBuilder.clusters;
  expect(clusters.length).toEqual(2);
  expect(clusters[0]!.root).toEqual('p2$ptr');
  expect(clusters[0]!.nodes.map((node) => node.uid)).toEqual([
    'p2$ptr',
    'p2',
    'f2',
    'c2',
    'b2',
  ]);
  expect(clusters[0]!.edges.map(edgeToString)).toEqual([
    'c2-list-e-b2-in$0-w',
    'f2-out$1-c-c2-list-w',
    'p2-out$0-c-f2-in$0-w',
    'p2-out$1-c-b2-in$0-w',
    'p2$ptr-e-p2-in$0-nw',
  ]);
  expect(clusters[1]!.root).toEqual('p1$ptr');
  expect(clusters[1]!.nodes.map((node) => node.uid)).toEqual([
    'p1$ptr',
    'p1',
    'f1',
    'b1',
  ]);
  expect(clusters[1]!.edges.map(edgeToString)).toEqual([
    'f1-list-e-b1-in$0-w',
    'p1-out$0-c-f1-list-w',
    'p1-out$1-c-b1-in$0-w',
    'p1$ptr-e-p1-in$0-nw',
  ]);
});

test('a single pointsto', () => {
  const valueConfig = { '@list_append': { label: '$1 ++ $2' } };
  const pts = [
    new HProp_PointsTo('', new Symbol(true, '@plus-p-1', 'p + 1'), '$MCell', [
      new Value('', '@list_append', ['l1', 'l2'], valueConfig),
    ]),
  ];
  const dotBuilder = new DotBuilder(config, pts);
  const dot = `
digraph {
graph [rankdir="LR", ranksep="0.05", nodesep="0.05", concentrate="false", splines="true", packmode="array_i", truecolor="true", bgcolor="#00000000", pad="0", fontname="Courier", fontsize="11"]
node [shape="plaintext", margin="0.05", fontname="Courier", fontsize="11"]
edge [tailclip="false", arrowsize="0.5", minlen="3"]
"@plus-p-1$ptr" [id="@plus-p-1$ptr", label="p + 1", fontsize="10", width="0"]
"@plus-p-1" [id="@plus-p-1", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>p + 1</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb">l1 ++ l2</td><td sides="trb"></td></tr></table>>]
"@plus-p-1$ptr":"e" -> "@plus-p-1":"in$0":"nw" [id="@plus-p-1$ptr-e", tailclip="true", minlen="1"]
}`.trim();

  expect(dotBuilder.dot).toEqual(dot);
});

test('escape html in labels', () => {
  const pts = [
    new HProp_PointsTo('', new Symbol(true, 'p', 'p'), '$MCell', [
      '(λ x : Z, #x) <$> xs',
    ]),
  ];
  const dotBuilder = new DotBuilder(config, pts);
  const dot = `
digraph {
graph [rankdir="LR", ranksep="0.05", nodesep="0.05", concentrate="false", splines="true", packmode="array_i", truecolor="true", bgcolor="#00000000", pad="0", fontname="Courier", fontsize="11"]
node [shape="plaintext", margin="0.05", fontname="Courier", fontsize="11"]
edge [tailclip="false", arrowsize="0.5", minlen="3"]
"p$ptr" [id="p$ptr", label="p", fontsize="10", width="0"]
"p" [id="p", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>p</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb">(λ x : Z, #x) &lt;$&gt; xs</td><td sides="trb"></td></tr></table>>]
"p$ptr":"e" -> "p":"in$0":"nw" [id="p$ptr-e", tailclip="true", minlen="1"]
}`.trim();

  expect(dotBuilder.dot).toEqual(dot);
});

test('integrated test: cfml example 0', () => {
  const text =
    ` ⟬ Star ┆ ⟬ Star ┆ ⟬ Exist ┆ f ┆ ⟬ Exist ┆ b ┆ ⟬ Exist ┆ d ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $MCell ┆ f ┆ b ⟧ ⟭ ┆ ⟬ Star ┆ ⟬ PointsTo ┆ f ┆ ⟦ $MListSeg ┆ b ┆ L1 ++ x :: L2' ⟧ ⟭ ┆ ⟬ PointsTo ┆ b ┆ ⟦ $MCell ┆ d ┆ null ⟧ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ ┆ ⟬ Exist ┆ f ┆ ⟬ Exist ┆ b ┆ ⟬ Exist ┆ d ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $MCell ┆ f ┆ b ⟧ ⟭ ┆ ⟬ Star ┆ ⟬ PointsTo ┆ f ┆ ⟦ $MListSeg ┆ b ┆ nil ⟧ ⟭ ┆ ⟬ PointsTo ┆ b ┆ ⟦ $MCell ┆ d ┆ null ⟧ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ ┆ ⟬ Opaque ┆ GC ⟭ ⟭ `.trim();
  const parser = new Parser(config);
  const goal = parser.parse(text);
  const pts = ((goal[0]! as HProp).args[0]! as HProp).args[0]! as HProp;
  expect(pts.op).toEqual('PointsTos');
  pts.args.forEach((pt) => expect(pt).toBeInstanceOf(HProp_PointsTo));
  const dotBuilder = new DotBuilder(config, pts.args as HProp_PointsTo[]);
  const dot = `
digraph {
graph [rankdir="LR", ranksep="0.05", nodesep="0.05", concentrate="false", splines="true", packmode="array_i", truecolor="true", bgcolor="#00000000", pad="0", fontname="Courier", fontsize="11"]
node [shape="plaintext", margin="0.05", fontname="Courier", fontsize="11"]
edge [tailclip="false", arrowsize="0.5", minlen="3"]
"p1$ptr" [id="p1$ptr", label="p1", fontsize="10", width="0"]
"p1" [id="p1", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>p1</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb"><font color="#3465a4">f0</font></td><td port="out$0" sides="trb"></td></tr><tr><td port="in$1" sides="tlb"><font color="#3465a4">b0</font></td><td port="out$1" sides="trb"></td></tr></table>>]
"f$0" [id="f$0", label=<<table border="0" cellborder="0" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>f0</td><td>: </td><td>MListSeg</td></tr></table></td></tr><tr><td port="list" sides="tlb">L1 ++ x :: L2&#39;</td><td sides="trb"></td></tr></table>>]
"b$0" [id="b$0", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>b0</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb"><font color="#3465a4">d0</font></td><td sides="trb"></td></tr><tr><td port="in$1" sides="tlb"><font face="Helvetica">∅</font></td><td sides="trb"></td></tr></table>>]
"f$0":"list":"e" -> "b$0":"in$0":"w" [id="f$0-list-e"]
"p1":"out$0":"c" -> "f$0":"list":"w" [id="p1-out$0-c", dir="both", arrowtail="dot", arrowhead="normal"]
"p1":"out$1":"c" -> "b$0":"in$0":"w" [id="p1-out$1-c", dir="both", arrowtail="dot", arrowhead="normal"]
"p1$ptr":"e" -> "p1":"in$0":"nw" [id="p1$ptr-e", tailclip="true", minlen="1"]
}`.trim();
  expect(dotBuilder.dot).toEqual(dot);
});

test('integrated test: cfml example 1', () => {
  const text =
    ` ⟬* PRE @ ⟬ Star ┆ ⟬ PointsTo ┆ b1 ┆ ⟦ $MCell ┆ x ┆ c2 ⟧ ⟭ ┆ ⟬ Star ┆ ⟬ PointsTo ┆ f2 ┆ ⟦ $MCell ┆ x ┆ c2 ⟧ ⟭ ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $MCell ┆ f2 ┆ b2 ⟧ ⟭ ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $MCell ┆ f1 ┆ b1 ⟧ ⟭ ┆ ⟬ Star ┆ ⟬ PointsTo ┆ c2 ┆ ⟦ $MListSeg ┆ b2 ┆ L2' ⟧ ⟭ ┆ ⟬ Star ┆ ⟬ PointsTo ┆ b2 ┆ ⟦ $MCell ┆ d2 ┆ null ⟧ ⟭ ┆ ⟬ PointsTo ┆ f1 ┆ ⟦ $MListSeg ┆ b1 ┆ L1 ⟧ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ *⟭ `.trim();
  const parser = new Parser(config);
  const goal = parser.parse(text);
  const pts = (goal[0]! as HProp).args[0]! as HProp;
  expect(pts.op).toEqual('PointsTos');
  pts.args.forEach((pt) => expect(pt).toBeInstanceOf(HProp_PointsTo));
  const dotBuilder = new DotBuilder(config, pts.args as HProp_PointsTo[]);
  const dot = `
digraph {
graph [rankdir="LR", ranksep="0.05", nodesep="0.05", concentrate="false", splines="true", packmode="array_i", truecolor="true", bgcolor="#00000000", pad="0", fontname="Courier", fontsize="11"]
node [shape="plaintext", margin="0.05", fontname="Courier", fontsize="11"]
edge [tailclip="false", arrowsize="0.5", minlen="3"]
"p2$ptr" [id="p2$ptr", label="p2", fontsize="10", width="0"]
"p1$ptr" [id="p1$ptr", label="p1", fontsize="10", width="0"]
"p1" [id="p1", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>p1</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb">f1</td><td port="out$0" sides="trb"></td></tr><tr><td port="in$1" sides="tlb">b1</td><td port="out$1" sides="trb"></td></tr></table>>]
"f1" [id="f1", label=<<table border="0" cellborder="0" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>f1</td><td>: </td><td>MListSeg</td></tr></table></td></tr><tr><td port="list" sides="tlb">L1</td><td sides="trb"></td></tr></table>>]
"b1" [id="b1", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>b1</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb">x</td><td sides="trb"></td></tr><tr><td port="in$1" sides="tlb">c2</td><td port="out$1" sides="trb"></td></tr></table>>]
"p2" [id="p2", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>p2</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb">f2</td><td port="out$0" sides="trb"></td></tr><tr><td port="in$1" sides="tlb">b2</td><td port="out$1" sides="trb"></td></tr></table>>]
"f2" [id="f2", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>f2</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb">x</td><td sides="trb"></td></tr><tr><td port="in$1" sides="tlb">c2</td><td port="out$1" sides="trb"></td></tr></table>>]
"c2" [id="c2", label=<<table border="0" cellborder="0" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>c2</td><td>: </td><td>MListSeg</td></tr></table></td></tr><tr><td port="list" sides="tlb">L2&#39;</td><td sides="trb"></td></tr></table>>]
"b2" [id="b2", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>b2</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb">d2</td><td sides="trb"></td></tr><tr><td port="in$1" sides="tlb"><font face="Helvetica">∅</font></td><td sides="trb"></td></tr></table>>]
"b1":"out$1":"c" -> "c2":"list":"w" [id="b1-out$1-c", dir="both", arrowtail="dot", arrowhead="normal"]
"c2":"list":"e" -> "b2":"in$0":"w" [id="c2-list-e"]
"f1":"list":"e" -> "b1":"in$0":"w" [id="f1-list-e"]
"f2":"out$1":"c" -> "c2":"list":"w" [id="f2-out$1-c", dir="both", arrowtail="dot", arrowhead="normal"]
"p1":"out$0":"c" -> "f1":"list":"w" [id="p1-out$0-c", dir="both", arrowtail="dot", arrowhead="normal"]
"p1":"out$1":"c" -> "b1":"in$0":"w" [id="p1-out$1-c", dir="both", arrowtail="dot", arrowhead="normal"]
"p1$ptr":"e" -> "p1":"in$0":"nw" [id="p1$ptr-e", tailclip="true", minlen="1"]
"p2":"out$0":"c" -> "f2":"in$0":"w" [id="p2-out$0-c", dir="both", arrowtail="dot", arrowhead="normal"]
"p2":"out$1":"c" -> "b2":"in$0":"w" [id="p2-out$1-c", dir="both", arrowtail="dot", arrowhead="normal"]
"p2$ptr":"e" -> "p2":"in$0":"nw" [id="p2$ptr-e", tailclip="true", minlen="1"]
}`.trim();
  expect(dotBuilder.dot).toEqual(dot);
});

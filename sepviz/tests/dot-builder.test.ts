import { DotBuilder, edgeToString } from '../src/dot-builder';
import { RenderConfig, defaultRenderConfig } from '../src/config';
import { HProp_PointsTo, Symbol, Value, Parser } from '../src/parser';
import { expect, test } from 'vitest';

const config: RenderConfig = {
  ...defaultRenderConfig(),
  constr: {
    TestConstr: {
      label: 'TestConstr',
      argNum: 0,
      args: {},
      drawBorder: false,
      inPort: undefined,
    },
    $MCell: {
      label: 'MCell',
      argNum: 2,
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
      argNum: 2,
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
    new HProp_PointsTo('', 'p1', '$MCell', ['f1', 'b1']),
    new HProp_PointsTo('', 'f2', '$MCell', ['x', 'c2']),
    new HProp_PointsTo('', 'c2', '$MListSeg', ['b2', "L2'"]),
    new HProp_PointsTo('', 'p2', '$MCell', ['f2', 'b2']),
    new HProp_PointsTo('', 'b2', '$MCell', ['d2', 'null']),
    new HProp_PointsTo('', 'f1', '$MListSeg', ['b1', 'L1']),
    new HProp_PointsTo('', 'b1', '$MCell', ['d1', 'null']),
  ];
  const dotBuilder = new DotBuilder(config, pts);
  const clusters = dotBuilder.clusters;
  expect(clusters.length).toEqual(2);
  expect(clusters[0].root).toEqual('p2$ptr');
  expect(clusters[0].nodes.map((node) => node.uid)).toEqual([
    'b2',
    'c2',
    'f2',
    'p2',
    'p2$ptr',
  ]);
  expect(clusters[0].edges.map(edgeToString)).toEqual([
    'c2-e-b2-w',
    'c2-list-e-b2-in$0-w',
    'f2-e-c2-w',
    'f2-out$1-c-c2-list-w',
    'p2-e-b2-w',
    'p2-e-f2-w',
    'p2-out$0-c-f2-in$0-w',
    'p2-out$1-c-b2-in$0-w',
    'p2$ptr-e-p2-in$0-nw',
  ]);
  expect(clusters[1].root).toEqual('p1$ptr');
  expect(clusters[1].nodes.map((node) => node.uid)).toEqual([
    'b1',
    'f1',
    'p1',
    'p1$ptr',
  ]);
  expect(clusters[1].edges.map(edgeToString)).toEqual([
    'f1-e-b1-w',
    'f1-list-e-b1-in$0-w',
    'p1-e-b1-w',
    'p1-e-f1-w',
    'p1-out$0-c-f1-list-w',
    'p1-out$1-c-b1-in$0-w',
    'p1$ptr-e-p1-in$0-nw',
  ]);
});

test('a single pointsto', () => {
  const valueConfig = { '@list_append': { argNum: 2, label: '$1 ++ $2' } };
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
"@plus-p-1" [id="@plus-p-1", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>p + 1</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb">l1 ++ l2</td><td sides="trb"></td></tr></table>>]
"@plus-p-1$ptr" [id="@plus-p-1$ptr", label="p + 1", fontsize="10", width="0"]
"@plus-p-1$ptr":"e" -> "@plus-p-1":"in$0":"nw" [id="@plus-p-1$ptr-e", tailclip="true", minlen="1"]
}`.trim();

  expect(dotBuilder.dot).toEqual(dot);
});

test('escape html in labels', () => {
  const pts = [new HProp_PointsTo('', 'p', '$MCell', ['(λ x : Z, #x) <$> xs'])];
  const dotBuilder = new DotBuilder(config, pts);
  const dot = `
digraph {
graph [rankdir="LR", ranksep="0.05", nodesep="0.05", concentrate="false", splines="true", packmode="array_i", truecolor="true", bgcolor="#00000000", pad="0", fontname="Courier", fontsize="11"]
node [shape="plaintext", margin="0.05", fontname="Courier", fontsize="11"]
edge [tailclip="false", arrowsize="0.5", minlen="3"]
"p" [id="p", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>p</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb">(λ x : Z, #x) &lt;$&gt; xs</td><td sides="trb"></td></tr></table>>]
"p$ptr" [id="p$ptr", label="p", fontsize="10", width="0"]
"p$ptr":"e" -> "p":"in$0":"nw" [id="p$ptr-e", tailclip="true", minlen="1"]
}`.trim();

  expect(dotBuilder.dot).toEqual(dot);
});

test('integrated test: cfml example', () => {
  const text =
    ` ⟬ Star ┆ ⟬ Star ┆ ⟬ Exist ┆ f ┆ ⟬ Exist ┆ b ┆ ⟬ Exist ┆ d ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $MCell ┆ f ┆ b ⟧ ⟭ ┆ ⟬ Star ┆ ⟬ PointsTo ┆ f ┆ ⟦ $MListSeg ┆ b ┆ L1 ++ x :: L2' ⟧ ⟭ ┆ ⟬ PointsTo ┆ b ┆ ⟦ $MCell ┆ d ┆ null ⟧ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ ┆ ⟬ Exist ┆ f ┆ ⟬ Exist ┆ b ┆ ⟬ Exist ┆ d ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $MCell ┆ f ┆ b ⟧ ⟭ ┆ ⟬ Star ┆ ⟬ PointsTo ┆ f ┆ ⟦ $MListSeg ┆ b ┆ nil ⟧ ⟭ ┆ ⟬ PointsTo ┆ b ┆ ⟦ $MCell ┆ d ┆ null ⟧ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ ┆ ⟬ Opaque ┆ GC ⟭ ⟭ `.trim();
  const parser = new Parser(config);
  const goal = parser.parse(text);
  const pts = goal[0]!.args[0]!.args[0]! as HProp;
  expect(pts.op).toEqual('PointsTos');
  const dotBuilder = new DotBuilder(config, pts.args);
  const dot = `
digraph {
graph [rankdir="LR", ranksep="0.05", nodesep="0.05", concentrate="false", splines="true", packmode="array_i", truecolor="true", bgcolor="#00000000", pad="0", fontname="Courier", fontsize="11"]
node [shape="plaintext", margin="0.05", fontname="Courier", fontsize="11"]
edge [tailclip="false", arrowsize="0.5", minlen="3"]
"b$0" [id="b$0", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>b0</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb"><font color="#3465a4">d0</font></td><td sides="trb"></td></tr><tr><td port="in$1" sides="tlb"><font face="Helvetica">∅</font></td><td sides="trb"></td></tr></table>>]
"f$0" [id="f$0", label=<<table border="0" cellborder="0" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>f0</td><td>: </td><td>MListSeg</td></tr></table></td></tr><tr><td port="list" sides="tlb">L1 ++ x :: L2&#39;</td><td sides="trb"></td></tr></table>>]
"p1" [id="p1", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>p1</td><td>: </td><td>MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb"><font color="#3465a4">f0</font></td><td port="out$0" sides="trb"></td></tr><tr><td port="in$1" sides="tlb"><font color="#3465a4">b0</font></td><td port="out$1" sides="trb"></td></tr></table>>]
"p1$ptr" [id="p1$ptr", label="p1", fontsize="10", width="0"]
"f$0":"e" -> "b$0":"w" [id="f$0-e", style="invis", constraint="false"]
"f$0":"list":"e" -> "b$0":"in$0":"w" [id="f$0-list-e"]
"p1":"e" -> "b$0":"w" [id="p1-e", style="invis", constraint="false"]
"p1":"e" -> "f$0":"w" [id="p1-e", style="invis", constraint="false"]
"p1":"out$0":"c" -> "f$0":"list":"w" [id="p1-out$0-c", dir="both", arrowtail="dot", arrowhead="normal"]
"p1":"out$1":"c" -> "b$0":"in$0":"w" [id="p1-out$1-c", dir="both", arrowtail="dot", arrowhead="normal"]
"p1$ptr":"e" -> "p1":"in$0":"nw" [id="p1$ptr-e", tailclip="true", minlen="1"]
}`.trim();
  expect(dotBuilder.dot).toEqual(dot);
});

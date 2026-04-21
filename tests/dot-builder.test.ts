import { DotBuilder } from '../src/dot-builder';
import { RenderConfig, defaultRenderConfig } from '../src/config';
import { HProp_PointsTo, Symbol, Value } from '../src/parser';
import { expect, test } from 'vitest';

const config: RenderConfig = {
  ...defaultRenderConfig(),
  constr: {
    TestConstr: {
      argNum: 0,
      args: {},
      drawBorder: false,
      inPort: null,
    },
    '@MCell': {
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
    '@MListSeg': {
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
    new HProp_PointsTo('PointsTo', 'p1', '@MCell', ['f1', 'b1']),
    new HProp_PointsTo('PointsTo', 'f2', '@MCell', ['x', 'c2']),
    new HProp_PointsTo('PointsTo', 'c2', '@MListSeg', ['b2', "L2'"]),
    new HProp_PointsTo('PointsTo', 'p2', '@MCell', ['f2', 'b2']),
    new HProp_PointsTo('PointsTo', 'b2', '@MCell', ['d2', 'null']),
    new HProp_PointsTo('PointsTo', 'f1', '@MListSeg', ['b1', 'L1']),
    new HProp_PointsTo('PointsTo', 'b1', '@MCell', ['d1', 'null']),
  ];
  const dotBuilder = new DotBuilder(config, pts);
  const clusters = dotBuilder.clusters;
  expect(clusters.length).toEqual(2);
  expect(clusters[0].root).toEqual('p2$ptr');
  expect(clusters[0].nodes.map((node) => node.uid)).toEqual([
    'f2',
    'c2',
    'p2',
    'b2',
    'p2$ptr',
  ]);
  expect(
    clusters[0].edges.map((edge) => `${edge.srcUid} --> ${edge.dstUid}`)
  ).toEqual([
    'f2 --> c2',
    'f2 --> c2',
    'c2 --> b2',
    'c2 --> b2',
    'p2 --> f2',
    'p2 --> f2',
    'p2 --> b2',
    'p2 --> b2',
    'p2$ptr --> p2',
  ]);
  expect(clusters[1].root).toEqual('p1$ptr');
  expect(clusters[1].nodes.map((node) => node.uid)).toEqual([
    'p1',
    'f1',
    'b1',
    'p1$ptr',
  ]);
  expect(
    clusters[1].edges.map((edge) => `${edge.srcUid} --> ${edge.dstUid}`)
  ).toEqual([
    'p1 --> f1',
    'p1 --> f1',
    'p1 --> b1',
    'p1 --> b1',
    'f1 --> b1',
    'f1 --> b1',
    'p1$ptr --> p1',
  ]);
});

test('test', () => {
  const valueConfig = {
    '@list_append': {
      argNum: 2,
      pattern: '$1 ++ $2',
    },
  };
  const pts = [
    new HProp_PointsTo(
      'PointsTo',
      new Symbol(true, '@plus-p-1', 'p + 1'),
      '@MCell',
      [new Value('@list_append', ['l1', 'l2'], valueConfig)]
    ),
  ];

  const dotBuilder = new DotBuilder(config, pts);
  const dot = `
digraph {
graph [rankdir="LR", ranksep="0.05", nodesep="0.05", concentrate="false", splines="true", packmode="array_i", truecolor="true", bgcolor="#00000000", pad="0", fontname="Courier", fontsize="11"]
node [shape="plaintext", margin="0.05", fontname="Courier", fontsize="11"]
edge [tailclip="false", arrowsize="0.5", minlen="3"]
"@plus-p-1" [id="@plus-p-1", label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="2"><tr><td colspan="2" cellpadding="0" sides="b"><table border="0" cellborder="0" cellspacing="0" cellpadding="0"><tr><td>p + 1</td><td>: </td><td>@MCell</td></tr></table></td></tr><tr><td port="in$0" sides="tlb">l1 ++ l2</td><td sides="trb"></td></tr></table>>]
"@plus-p-1$ptr" [id="@plus-p-1$ptr", label="p + 1", fontsize="10", width="0"]
"@plus-p-1$ptr":"e" -> "@plus-p-1":"in$0":"nw" [tailclip="true", minlen="1"]
}`.trim();

  expect(dotBuilder.dot).toEqual(dot);
});

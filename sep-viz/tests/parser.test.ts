import { Parser, Goal, HProp, HProp_PointsTo, Symbol } from '../src/parser';
import { expect, test } from 'vitest';

const valueConfig = {
  '@plus': {
    argNum: 2,
    label: '$1 + $2',
  },
  '@list_append': {
    argNum: 2,
    label: '$1 ++ $2',
  },
  '@eq': {
    argNum: 2,
    label: '$1 == $2',
  },
  '@gt': {
    argNum: 2,
    label: '$1 > $2',
  },
  $LitV: {
    argNum: 1,
    label: '#$1',
    uid: '$1',
  },
  $list_cons: {
    argNum: 2,
    label: '$1 :: $2',
  },
};
const parser = new Parser({ value: valueConfig }); // FIXME

test('flatten stars', () => {
  const text =
    'text ⟬ Star ┆ ⟬ Star ┆ A ┆ B ⟭ ┆ ⟬ Conj ┆ E ┆ F ⟭ ┆ ⟬ Star ┆ C ┆ D ⟭ ⟭ some more text';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    'text ',
    {
      raw: '⟬ Star ┆ ⟬ Star ┆ A ┆ B ⟭ ┆ ⟬ Conj ┆ E ┆ F ⟭ ┆ ⟬ Star ┆ C ┆ D ⟭ ⟭',
      op: 'Stars',
      args: [
        'A',
        'B',
        { raw: '⟬ Conj ┆ E ┆ F ⟭', op: 'Conjs', args: ['E', 'F'] },
        'C',
        'D',
      ],
    },
    ' some more text',
  ]);
});

test('resolve symbols', () => {
  // instead of `l1 ++ l2`, the rocq output should be ⟦ list_append ┆ l1 ┆ l2 ⟧
  const text =
    '(fun r => ⟬ Exist ┆ l1 ┆ ⟬ PointsTo ┆ r ┆ ⟦ isList ┆ ⟦ @list_append ┆ l1 ┆ l2 ⟧ ⟧ ⟭ ⟭)';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    '(fun r => ',
    {
      raw: '⟬ PointsTo ┆ r ┆ ⟦ isList ┆ ⟦ @list_append ┆ l1 ┆ l2 ⟧ ⟧ ⟭',
      op: 'PointsTo',
      args: [],
      loc: 'r',
      repr: 'isList',
      reprArgs: [
        {
          raw: '⟦ @list_append ┆ l1 ┆ l2 ⟧',
          op: '@list_append',
          args: [{ isGlobal: false, uid: 'l1$0', label: 'l10' }, 'l2'],
          uid: '@list_append-l1$0-l2',
          label: 'l10 ++ l2',
        },
      ],
    },
    ')',
  ]);
});

test('aggregate pures', () => {
  const text =
    '⟬ Star ┆ ⟬ Star ┆ ⟬ Pure ┆ ⟦ @eq ┆ l1 ┆ l2 ⟧ ⟭ ┆ ⟬ Pure ┆ ⟦ @gt ┆ x ┆ y ⟧ ⟭ ⟭ ┆ A ⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    {
      raw: '⟬ Star ┆ ⟬ Star ┆ ⟬ Pure ┆ ⟦ @eq ┆ l1 ┆ l2 ⟧ ⟭ ┆ ⟬ Pure ┆ ⟦ @gt ┆ x ┆ y ⟧ ⟭ ⟭ ┆ A ⟭',
      op: 'Stars',
      args: [
        {
          raw: '',
          op: 'Pures',
          args: [
            {
              raw: '⟬ Pure ┆ ⟦ @eq ┆ l1 ┆ l2 ⟧ ⟭',
              op: 'Pure',
              args: [
                {
                  raw: '⟦ @eq ┆ l1 ┆ l2 ⟧',
                  op: '@eq',
                  args: ['l1', 'l2'],
                  uid: '@eq-l1-l2',
                  label: 'l1 == l2',
                },
              ],
            },
            {
              raw: '⟬ Pure ┆ ⟦ @gt ┆ x ┆ y ⟧ ⟭',
              op: 'Pure',
              args: [
                {
                  raw: '⟦ @gt ┆ x ┆ y ⟧',
                  op: '@gt',
                  args: ['x', 'y'],
                  uid: '@gt-x-y',
                  label: 'x > y',
                },
              ],
            },
          ],
        },
        'A',
      ],
    },
  ]);
});

test('pointsto example', () => {
  const text = `⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ @MCell ┆ f1 ┆ b1 ⟧ ⟭
┆ ⟬ Star ┆ ⟬ PointsTo ┆ f2 ┆ ⟦ @MCell ┆ x ┆ c2 ⟧ ⟭
┆ ⟬ Star ┆ ⟬ PointsTo ┆ c2 ┆ ⟦ @MListSeg ┆ b2 ┆ L2' ⟧ ⟭
┆ ⟬ Star ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ @MCell ┆ f2 ┆ b2 ⟧ ⟭
┆ ⟬ Star ┆ ⟬ PointsTo ┆ b2 ┆ ⟦ @MCell ┆ d2 ┆ null ⟧ ⟭
┆ ⟬ Star ┆ ⟬ PointsTo ┆ f1 ┆ ⟦ @MListSeg ┆ b1 ┆ L1 ⟧ ⟭ ┆ ⟬ PointsTo ┆ b1 ┆ ⟦ @MCell ┆ d1 ┆ null ⟧ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭`;
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    {
      raw: "⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ @MCell ┆ f1 ┆ b1 ⟧ ⟭\n┆ ⟬ Star ┆ ⟬ PointsTo ┆ f2 ┆ ⟦ @MCell ┆ x ┆ c2 ⟧ ⟭\n┆ ⟬ Star ┆ ⟬ PointsTo ┆ c2 ┆ ⟦ @MListSeg ┆ b2 ┆ L2' ⟧ ⟭\n┆ ⟬ Star ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ @MCell ┆ f2 ┆ b2 ⟧ ⟭\n┆ ⟬ Star ┆ ⟬ PointsTo ┆ b2 ┆ ⟦ @MCell ┆ d2 ┆ null ⟧ ⟭\n┆ ⟬ Star ┆ ⟬ PointsTo ┆ f1 ┆ ⟦ @MListSeg ┆ b1 ┆ L1 ⟧ ⟭ ┆ ⟬ PointsTo ┆ b1 ┆ ⟦ @MCell ┆ d1 ┆ null ⟧ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭",
      op: 'Stars',
      args: [
        {
          raw: '',
          op: 'PointsTos',
          args: [
            {
              raw: '⟬ PointsTo ┆ p1 ┆ ⟦ @MCell ┆ f1 ┆ b1 ⟧ ⟭',
              op: 'PointsTo',
              args: [],
              loc: 'p1',
              repr: '@MCell',
              reprArgs: ['f1', 'b1'],
            },
            {
              raw: '⟬ PointsTo ┆ f2 ┆ ⟦ @MCell ┆ x ┆ c2 ⟧ ⟭',
              op: 'PointsTo',
              args: [],
              loc: 'f2',
              repr: '@MCell',
              reprArgs: ['x', 'c2'],
            },
            {
              raw: "⟬ PointsTo ┆ c2 ┆ ⟦ @MListSeg ┆ b2 ┆ L2' ⟧ ⟭",
              op: 'PointsTo',
              args: [],
              loc: 'c2',
              repr: '@MListSeg',
              reprArgs: ['b2', "L2'"],
            },
            {
              raw: '⟬ PointsTo ┆ p2 ┆ ⟦ @MCell ┆ f2 ┆ b2 ⟧ ⟭',
              op: 'PointsTo',
              args: [],
              loc: 'p2',
              repr: '@MCell',
              reprArgs: ['f2', 'b2'],
            },
            {
              raw: '⟬ PointsTo ┆ b2 ┆ ⟦ @MCell ┆ d2 ┆ null ⟧ ⟭',
              op: 'PointsTo',
              args: [],
              loc: 'b2',
              repr: '@MCell',
              reprArgs: ['d2', 'null'],
            },
            {
              raw: '⟬ PointsTo ┆ f1 ┆ ⟦ @MListSeg ┆ b1 ┆ L1 ⟧ ⟭',
              op: 'PointsTo',
              args: [],
              loc: 'f1',
              repr: '@MListSeg',
              reprArgs: ['b1', 'L1'],
            },
            {
              raw: '⟬ PointsTo ┆ b1 ┆ ⟦ @MCell ┆ d1 ┆ null ⟧ ⟭',
              op: 'PointsTo',
              args: [],
              loc: 'b1',
              repr: '@MCell',
              reprArgs: ['d1', 'null'],
            },
          ],
        },
      ],
    },
  ]);
});

test('term array', () => {
  const text = '⟬ Pure ┆ l3 = ┆ ⟦ @eq ┆ l1 ┆ l2 ⟧ ⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    {
      raw: '⟬ Pure ┆ l3 = ┆ ⟦ @eq ┆ l1 ┆ l2 ⟧ ⟭',
      op: 'Pure',
      args: [
        'l3 =',
        {
          raw: '⟦ @eq ┆ l1 ┆ l2 ⟧',
          op: '@eq',
          args: ['l1', 'l2'],
          uid: '@eq-l1-l2',
          label: 'l1 == l2',
        },
      ],
    },
  ]);
});

test('pointsto with loc containing value', () => {
  // x + (p + 1)  ->  l1 ++ l2
  const text =
    '⟬ PointsTo ┆ x + ⟦ @plus ┆ p ┆ 1 ⟧ ┆ ⟦ isList ┆ ⟦ @list_append ┆ l1 ┆ l2 ⟧ ⟧ ⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    {
      raw: '⟬ PointsTo ┆ x + ⟦ @plus ┆ p ┆ 1 ⟧ ┆ ⟦ isList ┆ ⟦ @list_append ┆ l1 ┆ l2 ⟧ ⟧ ⟭',
      op: 'PointsTo',
      args: [],
      loc: 'x + p + 1',
      repr: 'isList',
      reprArgs: [
        {
          raw: '⟦ @list_append ┆ l1 ┆ l2 ⟧',
          op: '@list_append',
          args: ['l1', 'l2'],
          uid: '@list_append-l1-l2',
          label: 'l1 ++ l2',
        },
      ],
    },
  ]);
});

test('cfml triple', () => {
  const text = '⟬* POST @ (fun x: A => and some more ⟬ Opaque ┆ GC ⟭ ) *⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    '(fun x: A => and some more',
    { raw: '⟬ Opaque ┆ GC ⟭', op: 'Opaque', args: ['GC'], ctx: 'POST' },
    ')',
  ]);
});

test('iris', () => {
  const text = `
  ⟬* PRE @ "HQ1" : ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ L1 ⟧ ⟭ *⟭
  ⟬* PRE @ "HQ2" : ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ L2 ⟧ ⟭ *⟭
  ⟬* PRE @ "HΦ" : ⟬ Later ┆ ⟬ Wand ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭
                                       ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭ ⟭ ┆ Φ ⟦ $LitV ┆ ()%V ⟧ ⟭ ⟭ *⟭
  --------------------------------------∗
  WP transfer ⟦ $LitV ┆ p1 ⟧ ⟦ $LitV ┆ p2 ⟧ {{ v, Φ v }}
`.trim();
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    {
      raw: '⟬* PRE @ "HQ1" : ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ L1 ⟧ ⟭ *⟭⟬* PRE @ "HQ2" : ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ L2 ⟧ ⟭ *⟭⟬* PRE @ "HΦ" : ⟬ Later ┆ ⟬ Wand ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭\n                                       ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭ ⟭ ┆ Φ ⟦ $LitV ┆ ()%V ⟧ ⟭ ⟭ *⟭',
      op: 'Stars',
      args: [
        {
          raw: '',
          op: 'PointsTos',
          args: [
            {
              raw: '⟬* PRE @ "HQ1" : ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ L1 ⟧ ⟭ *⟭',
              op: 'PointsTo',
              args: [],
              ctx: 'PRE',
              binder: 'HQ1',
              loc: 'p1',
              repr: '$isQueue',
              reprArgs: ['L1'],
            },
            {
              raw: '⟬* PRE @ "HQ2" : ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ L2 ⟧ ⟭ *⟭',
              op: 'PointsTo',
              args: [],
              ctx: 'PRE',
              binder: 'HQ2',
              loc: 'p2',
              repr: '$isQueue',
              reprArgs: ['L2'],
            },
          ],
          ctx: 'PRE',
        },
        {
          raw: '⟬* PRE @ "HΦ" : ⟬ Later ┆ ⟬ Wand ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭\n                                       ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭ ⟭ ┆ Φ ⟦ $LitV ┆ ()%V ⟧ ⟭ ⟭ *⟭',
          op: 'Later',
          args: [
            {
              raw: '⟬ Wand ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭\n                                       ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭ ⟭ ┆ Φ ⟦ $LitV ┆ ()%V ⟧ ⟭',
              op: 'Wand',
              args: [
                {
                  raw: '⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭\n                                       ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭ ⟭',
                  op: 'Stars',
                  args: [
                    {
                      raw: '',
                      op: 'PointsTos',
                      args: [
                        {
                          raw: '⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭',
                          op: 'PointsTo',
                          args: [],
                          loc: 'p1',
                          repr: '$isQueue',
                          reprArgs: [
                            {
                              raw: '⟦ $list_app ┆ L1 ┆ L2 ⟧',
                              op: '$list_app',
                              args: ['L1', 'L2'],
                              uid: '$list_app-L1-L2',
                              label: '$list_app(L1, L2)',
                            },
                          ],
                        },
                        {
                          raw: '⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭',
                          op: 'PointsTo',
                          args: [],
                          loc: 'p2',
                          repr: '$isQueue',
                          reprArgs: ['[]'],
                        },
                      ],
                    },
                  ],
                },
                [
                  'Φ ',
                  {
                    raw: '⟦ $LitV ┆ ()%V ⟧',
                    op: '$LitV',
                    args: ['()%V'],
                    uid: '()%V',
                    label: '#()%V',
                  },
                ],
              ],
            },
          ],
          ctx: 'PRE',
          binder: 'HΦ',
        },
      ],
      ctx: 'PRE',
    },
    '\n  --------------------------------------∗\n  WP transfer #p1 #p2 {{ v, Φ v }}',
  ]);
});

test('value inside a value argument', () => {
  const text = `
WP if: ~ ⟦ $LitV ┆ bool_decide (⟦ $list_cons ┆ x ┆ L2' ⟧ = [])⟧
    then let: "b1" := Snd ! ⟦ $LitV ┆ p1 ⟧ in
         let: "f2" := Fst ! ⟦ $LitV ┆ p2 ⟧ in
         let: "d" := Fst ! "b1" in
         "b1" <- (Fst ! "f2", Snd ! "f2");;
         ⟦ $LitV ┆ p1 ⟧ <- (Fst ! ⟦ $LitV ┆ p1 ⟧, Snd ! ⟦ $LitV ┆ p2 ⟧);;
         "f2" <- ("d", InjLV ⟦ $LitV ┆ ()%V ⟧);; ⟦ $LitV ┆ p2 ⟧ <- (Fst ! ⟦ $LitV ┆ p2 ⟧, "f2")
    else ⟦ $LitV ┆ ()%V ⟧
{{ v, Φ v }}
`.trim();
  const goal = parser.parse(text);
  expect(goal).toEqual([
    'WP if: ~ #bool_decide (x :: L2\' = [])\n    then let: "b1" := Snd ! #p1 in\n         let: "f2" := Fst ! #p2 in\n         let: "d" := Fst ! "b1" in\n         "b1" <- (Fst ! "f2", Snd ! "f2");;\n         #p1 <- (Fst ! #p1, Snd ! #p2);;\n         "f2" <- ("d", InjLV #()%V);; #p2 <- (Fst ! #p2, "f2")\n    else #()%V\n{{ v, Φ v }}',
  ]);
});

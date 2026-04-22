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
    new HProp(5, 70, 'Stars', [
      'A',
      'B',
      new HProp(33, 49, 'Conjs', ['E', 'F']),
      'C',
      'D',
    ]),
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
    new HProp_PointsTo(25, 83, 'r', 'isList', [
      {
        _start: 53,
        _end: 79,
        op: '@list_append',
        args: [new Symbol(false, 'l1$0', 'l10'), 'l2'],
        uid: '@list_append-l1$0-l2',
        label: 'l10 ++ l2',
      },
    ]),
    ')',
  ]);
});

test('aggregate pures', () => {
  const text =
    '⟬ Star ┆ ⟬ Star ┆ ⟬ Pure ┆ ⟦ @eq ┆ l1 ┆ l2 ⟧ ⟭ ┆ ⟬ Pure ┆ ⟦ @gt ┆ x ┆ y ⟧ ⟭ ⟭ ┆ A ⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    new HProp(0, 83, 'Stars', [
      new HProp(-1, -1, 'Pures', [
        new HProp(18, 46, 'Pure', [
          {
            _start: 27,
            _end: 44,
            op: '@eq',
            args: ['l1', 'l2'],
            uid: '@eq-l1-l2',
            label: 'l1 == l2',
          },
        ]),
        new HProp(49, 75, 'Pure', [
          {
            _start: 58,
            _end: 73,
            op: '@gt',
            args: ['x', 'y'],
            uid: '@gt-x-y',
            label: 'x > y',
          },
        ]),
      ]),
      'A',
    ]),
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
    new HProp(0, 374, 'Stars', [
      new HProp(-1, -1, 'PointsTos', [
        new HProp_PointsTo(9, 49, 'p1', '@MCell', ['f1', 'b1']),
        new HProp_PointsTo(61, 100, 'f2', '@MCell', ['x', 'c2']),
        new HProp_PointsTo(112, 156, 'c2', '@MListSeg', ['b2', "L2'"]),
        new HProp_PointsTo(168, 208, 'p2', '@MCell', ['f2', 'b2']),
        new HProp_PointsTo(220, 262, 'b2', '@MCell', ['d2', 'null']),
        new HProp_PointsTo(274, 317, 'f1', '@MListSeg', ['b1', 'L1']),
        new HProp_PointsTo(320, 362, 'b1', '@MCell', ['d1', 'null']),
      ]),
    ]),
  ]);
});

test('term array', () => {
  const text = '⟬ Pure ┆ l3 = ┆ ⟦ @eq ┆ l1 ┆ l2 ⟧ ⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    new HProp(0, 35, 'Pure', [
      'l3 =',
      {
        _start: 16,
        _end: 33,
        op: '@eq',
        args: ['l1', 'l2'],
        uid: '@eq-l1-l2',
        label: 'l1 == l2',
      },
    ]),
  ]);
});

test('pointsto with loc being value', () => {
  // p + 1  ->  l1 ++ l2
  const text =
    '⟬ PointsTo ┆ ⟦ @plus ┆ p ┆ 1 ⟧ ┆ ⟦ isList ┆ ⟦ @list_append ┆ l1 ┆ l2 ⟧ ⟧ ⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    new HProp_PointsTo(
      0,
      74,
      new Symbol(true, '@plus-p-1', 'p + 1'),
      'isList',
      [
        {
          _start: 44,
          _end: 70,
          op: '@list_append',
          args: ['l1', 'l2'],
          label: 'l1 ++ l2',
          uid: '@list_append-l1-l2',
        },
      ]
    ),
  ]);
});

test('cfml triple', () => {
  const text = '⟬* POST @ (fun x: A => and some more ⟬ Opaque ┆ GC ⟭ ) *⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    '(fun x: A => and some more',
    new HProp(37, 52, 'Opaque', ['GC'], 'POST'),
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
      _start: 0,
      _end: 331,
      op: 'Stars',
      ctx: 'PRE',
      args: [
        {
          _start: -1,
          _end: -1,
          op: 'PointsTos',
          ctx: 'PRE',
          args: [
            {
              _start: 0,
              _end: 57,
              op: 'PointsTo',
              binder: 'HQ1',
              ctx: 'PRE',
              loc: 'p1',
              repr: '$isQueue',
              reprArgs: ['L1'],
              args: [],
            },
            {
              _start: 60,
              _end: 117,
              op: 'PointsTo',
              binder: 'HQ2',
              ctx: 'PRE',
              loc: 'p2',
              repr: '$isQueue',
              reprArgs: ['L2'],
              args: [],
            },
          ],
        },
        {
          _start: 120,
          _end: 331,
          op: 'Later',
          binder: 'HΦ',
          ctx: 'PRE',
          args: [
            {
              _start: 146,
              _end: 326,
              op: 'Wand',
              args: [
                {
                  _start: 155,
                  _end: 303,
                  op: 'Stars',
                  args: [
                    {
                      _start: -1,
                      _end: -1,
                      op: 'PointsTos',
                      args: [
                        {
                          _start: 164,
                          _end: 222,
                          op: 'PointsTo',
                          loc: 'p1',
                          repr: '$isQueue',
                          reprArgs: [
                            {
                              _start: 195,
                              _end: 218,
                              op: '$list_app',
                              args: ['L1', 'L2'],
                              label: '$list_app(L1, L2)',
                              uid: '$list_app-L1-L2',
                            },
                          ],
                          args: [],
                        },
                        {
                          _start: 264,
                          _end: 301,
                          op: 'PointsTo',
                          loc: 'p2',
                          repr: '$isQueue',
                          reprArgs: ['[]'],
                          args: [],
                        },
                      ],
                    },
                  ],
                },
                [
                  'Φ ',
                  {
                    _start: 308,
                    _end: 324,
                    op: '$LitV',
                    args: ['()%V'],
                    label: '#()%V',
                    uid: '()%V',
                  },
                ],
              ],
            },
          ],
        },
      ],
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
    `WP if: ~ #bool_decide (x :: L2' = [])
    then let: "b1" := Snd ! #p1 in
         let: "f2" := Fst ! #p2 in
         let: "d" := Fst ! "b1" in
         "b1" <- (Fst ! "f2", Snd ! "f2");;
         #p1 <- (Fst ! #p1, Snd ! #p2);;
         "f2" <- ("d", InjLV #()%V);; #p2 <- (Fst ! #p2, "f2")
    else #()%V
{{ v, Φ v }}`,
  ]);
});

import { parse } from '../src/sep-grammar.g';
import { expect, test } from 'vitest';

function tryParse(desc, input) {
  console.log(`\n=== ${desc} ===`);
  console.log(`Input: "${input}"`);
  try {
    const result = parse(input);
    console.log('Success:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('Failed:', e.message);
    if (e.location) {
      const pos = e.location.start.offset;
      console.log(
        `At position ${pos}: "${input.substring(Math.max(0, pos - 10), pos)}>>>${input.substring(pos, pos + 15)}"`
      );
    }
  }
}

test('parse one simple plain region', () => {
  expect(parse('text ⟬Opaque┆emp⟭ some more text')).toEqual([
    'text ',
    {
      raw: '⟬Opaque┆emp⟭',
      kind: 'hprop',
      args: ['emp'],
      op: 'Opaque',
    },
    ' some more text',
  ]);
});

test('parse one simple named region', () => {
  expect(
    parse('text ⟬* PRE @ "Hφ": ⟬ Opaque ┆ emp ⟭ *⟭ some more text')
  ).toEqual([
    'text ',
    {
      raw: '⟬* PRE @ "Hφ": ⟬ Opaque ┆ emp ⟭ *⟭',
      kind: 'hprop',
      op: 'Opaque',
      args: ['emp'],
      binder: 'Hφ',
      ctx: 'PRE',
    },
    ' some more text',
  ]);
});

test('parse two regions', () => {
  expect(
    parse(
      '⟬* PRE @ "Hφ": ⟬ NULL ┆ emp ⟭ *⟭ code do something (fun r => ⟬* POST @ ⟬ PointsTo ┆ r ┆ isList ┆ l1 ++ l2 ⟭ *⟭) '
    )
  ).toEqual([
    {
      raw: '⟬* PRE @ "Hφ": ⟬ NULL ┆ emp ⟭ *⟭',
      kind: 'hprop',
      args: ['emp'],
      op: 'NULL',
      binder: 'Hφ',
      ctx: 'PRE',
    },
    ' code do something (fun r => ',
    {
      raw: '⟬* POST @ ⟬ PointsTo ┆ r ┆ isList ┆ l1 ++ l2 ⟭ *⟭',
      kind: 'hprop',
      op: 'PointsTo',
      args: ['r', 'isList', 'l1 ++ l2'],
      ctx: 'POST',
    },
    ') ',
  ]);
});

test('parse value', () => {
  expect(
    parse(
      'text ⟬ PointsTo ┆ p ┆ isValue ┆ z + ⟦ SpecialV ┆ x ┆ y ⟧ ⟭ some more text'
    )
  ).toEqual([
    'text ',
    {
      raw: '⟬ PointsTo ┆ p ┆ isValue ┆ z + ⟦ SpecialV ┆ x ┆ y ⟧ ⟭',
      kind: 'hprop',
      op: 'PointsTo',
      args: [
        'p',
        'isValue',
        [
          'z + ',
          {
            raw: '⟦ SpecialV ┆ x ┆ y ⟧',
            kind: 'value',
            op: 'SpecialV',
            args: ['x', 'y'],
          },
        ],
      ],
    },
    ' some more text',
  ]);
});

test('parse nested hprops', () => {
  expect(
    parse(
      '⟬ STAR ┆ A ┆ ⟬ STAR ┆ B ┆ C ⟭ ┆ ⟬ PointsTo ┆ p: Int ┆ isList ┆ l1 ++ l2 ⟭ ⟭'
    )
  ).toEqual([
    {
      raw: '⟬ STAR ┆ A ┆ ⟬ STAR ┆ B ┆ C ⟭ ┆ ⟬ PointsTo ┆ p: Int ┆ isList ┆ l1 ++ l2 ⟭ ⟭',
      kind: 'hprop',
      op: 'STAR',
      args: [
        'A',
        {
          raw: '⟬ STAR ┆ B ┆ C ⟭',
          kind: 'hprop',
          op: 'STAR',
          args: ['B', 'C'],
        },
        {
          raw: '⟬ PointsTo ┆ p: Int ┆ isList ┆ l1 ++ l2 ⟭',
          kind: 'hprop',
          op: 'PointsTo',
          args: ['p: Int', 'isList', 'l1 ++ l2'],
        },
      ],
    },
  ]);
});

test('cfml triple', () => {
  expect(
    parse('⟬* POST @ (fun x: A => and some more ⟬ Opaque ┆ GC ⟭ ) *⟭')
  ).toEqual([
    {
      raw: '⟬* POST @ (fun x: A => and some more ⟬ Opaque ┆ GC ⟭ ) *⟭',
      kind: 'rich-hprop',
      prefix: '(fun x: A => and some more',
      hprop: {
        raw: '⟬ Opaque ┆ GC ⟭',
        kind: 'hprop',
        args: ['GC'],
        ctx: 'POST',
        op: 'Opaque',
      },
      postfix: ')',
    },
  ]);
});

test('values in segments', () => {
  const text = `
⟬* PRE @ "HQ1" : ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ L1 ⟧ ⟭ *⟭
⟬* PRE @ "HΦ" : ⟬ Later ┆ ⟬ Wand ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭ ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭ ⟭ ┆ Φ ⟦ $LitV ┆ ()%V ⟧ ⟭ ⟭ *⟭
--------------------------------------∗
WP transfer ⟦ $LitV ┆ p1 ⟧ ⟦ $LitV ┆ p2 ⟧ {{ v, Φ v }}
`.trim();
  expect(parse(text)).toEqual([
    {
      raw: '⟬* PRE @ "HQ1" : ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ L1 ⟧ ⟭ *⟭',
      kind: 'hprop',
      op: 'PointsTo',
      ctx: 'PRE',
      binder: 'HQ1',
      args: [
        'p1',
        {
          raw: '⟦ $isQueue ┆ L1 ⟧',
          kind: 'value',
          op: '$isQueue',
          args: ['L1'],
        },
      ],
    },
    '\n',
    {
      raw: '⟬* PRE @ "HΦ" : ⟬ Later ┆ ⟬ Wand ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭ ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭ ⟭ ┆ Φ ⟦ $LitV ┆ ()%V ⟧ ⟭ ⟭ *⟭',
      binder: 'HΦ',
      ctx: 'PRE',
      kind: 'hprop',
      op: 'Later',
      args: [
        {
          raw: '⟬ Wand ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭ ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭ ⟭ ┆ Φ ⟦ $LitV ┆ ()%V ⟧ ⟭',
          kind: 'hprop',
          op: 'Wand',
          args: [
            {
              raw: '⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭ ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭ ⟭',
              kind: 'hprop',
              op: 'Star',
              args: [
                {
                  raw: '⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭',
                  kind: 'hprop',
                  op: 'PointsTo',
                  args: [
                    'p1',
                    {
                      raw: '⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧',
                      kind: 'value',
                      op: '$isQueue',
                      args: [
                        {
                          raw: '⟦ $list_app ┆ L1 ┆ L2 ⟧',
                          kind: 'value',
                          op: '$list_app',
                          args: ['L1', 'L2'],
                        },
                      ],
                    },
                  ],
                },
                {
                  raw: '⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭',
                  kind: 'hprop',
                  op: 'PointsTo',
                  args: [
                    'p2',
                    {
                      raw: '⟦ $isQueue ┆ [] ⟧',
                      kind: 'value',
                      op: '$isQueue',
                      args: ['[]'],
                    },
                  ],
                },
              ],
            },
            [
              'Φ ',
              {
                raw: '⟦ $LitV ┆ ()%V ⟧',
                kind: 'value',
                op: '$LitV',
                args: ['()%V'],
              },
            ],
          ],
        },
      ],
    },
    `\n--------------------------------------∗\nWP transfer `,
    {
      raw: '⟦ $LitV ┆ p1 ⟧',
      kind: 'value',
      op: '$LitV',
      args: ['p1'],
    },
    ' ',
    {
      raw: '⟦ $LitV ┆ p2 ⟧',
      kind: 'value',
      op: '$LitV',
      args: ['p2'],
    },
    ' {{ v, Φ v }}',
  ]);
});

test('abstract hprop in pre or post', () => {
  const text =
    "⟬* PRE @ H' *⟭ CODE <[ Seq (App incr p) ; (App val_get p) ]> ⟬* POST @ Q' *⟭";
  expect(parse(text)).toEqual([
    {
      raw: "⟬* PRE @ H' *⟭",
      kind: 'rich-hprop',
      hprop: {
        args: ["H'"],
        ctx: 'PRE',
        kind: 'hprop',
        op: 'Opaque',
        raw: "H'",
      },
    },
    ' CODE <[ Seq (App incr p) ; (App val_get p) ]> ',
    {
      raw: "⟬* POST @ Q' *⟭",
      kind: 'rich-hprop',
      hprop: {
        args: ["Q'"],
        ctx: 'POST',
        kind: 'hprop',
        op: 'Opaque',
        raw: "Q'",
      },
    },
  ]);
});

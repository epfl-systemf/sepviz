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
        `At position ${pos}: "${input.substring(Math.max(0, pos - 5), pos)}>>>${input.substring(pos, pos + 10)}"`
      );
    }
  }
}

test('parse one simple plain region', () => {
  expect(parse('text ⟬ Opaque ┆ emp ⟭ some more text')).toEqual([
    'text ',
    { kind: 'hprop', args: ['emp'], op: 'Opaque' },
    ' some more text',
  ]);
});

test('parse one simple named region', () => {
  expect(
    parse('text ⟬* PRE @ "Hφ": ⟬ Opaque ┆ emp ⟭ *⟭ some more text')
  ).toEqual([
    'text ',
    {
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
      kind: 'hprop',
      args: ['emp'],
      op: 'NULL',
      binder: 'Hφ',
      ctx: 'PRE',
    },
    ' code do something (fun r => ',
    {
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
      kind: 'hprop',
      args: [
        'p',
        'isValue',
        ['z + ', { kind: 'value', op: 'SpecialV', args: ['x', 'y'] }],
      ],
      op: 'PointsTo',
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
      kind: 'hprop',
      op: 'STAR',
      args: [
        'A',
        { kind: 'hprop', op: 'STAR', args: ['B', 'C'] },
        {
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
      kind: 'rich-hprop',
      prefix: '(fun x: A => and some more',
      hprop: {
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
⟬* PRE @ "HQ2" : ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ L2 ⟧ ⟭ *⟭
⟬* PRE @ "HΦ" : ⟬ Later ┆ ⟬ Wand ┆ ⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $isQueue ┆ ⟦ $list_app ┆ L1 ┆ L2 ⟧ ⟧ ⟭
                                    ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $isQueue ┆ [] ⟧ ⟭ ⟭ ┆ Φ ⟦ $LitV ┆ ()%V ⟧ ⟭ ⟭ *⟭
--------------------------------------∗
WP transfer ⟦ $LitV ┆ p1 ⟧ ⟦ $LitV ┆ p2 ⟧ {{ v, Φ v }}
`.trim();
  expect(parse(text)).toEqual([
    {
      args: ['p1', { args: ['L1'], kind: 'value', op: '$isQueue' }],
      binder: 'HQ1',
      ctx: 'PRE',
      kind: 'hprop',
      op: 'PointsTo',
    },
    '\n',
    {
      args: ['p2', { args: ['L2'], kind: 'value', op: '$isQueue' }],
      binder: 'HQ2',
      ctx: 'PRE',
      kind: 'hprop',
      op: 'PointsTo',
    },
    '\n',
    {
      args: [
        {
          args: [
            {
              args: [
                {
                  args: [
                    'p1',
                    {
                      args: [
                        { args: ['L1', 'L2'], kind: 'value', op: '$list_app' },
                      ],
                      kind: 'value',
                      op: '$isQueue',
                    },
                  ],
                  kind: 'hprop',
                  op: 'PointsTo',
                },
                {
                  args: ['p2', { args: ['[]'], kind: 'value', op: '$isQueue' }],
                  kind: 'hprop',
                  op: 'PointsTo',
                },
              ],
              kind: 'hprop',
              op: 'Star',
            },
            ['Φ ', { args: ['()%V'], kind: 'value', op: '$LitV' }],
          ],
          kind: 'hprop',
          op: 'Wand',
        },
      ],
      binder: 'HΦ',
      ctx: 'PRE',
      kind: 'hprop',
      op: 'Later',
    },
    `\n--------------------------------------∗\nWP transfer `,
    { args: ['p1'], kind: 'value', op: '$LitV' },
    ' ',
    { args: ['p2'], kind: 'value', op: '$LitV' },
    ' {{ v, Φ v }}',
  ]);
});

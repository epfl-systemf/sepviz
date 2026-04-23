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
  expect(parse('text ⟬Opaque┆emp⟭ some more text')).toEqual([
    'text ',
    {
      _start: 5,
      _end: 17,
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
      _start: 5,
      _end: 39,
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
      _start: 0,
      _end: 32,
      kind: 'hprop',
      args: ['emp'],
      op: 'NULL',
      binder: 'Hφ',
      ctx: 'PRE',
    },
    ' code do something (fun r => ',
    {
      _start: 61,
      _end: 110,
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
      op: 'PointsTo',
      args: [
        'p',
        'isValue',
        [
          'z + ',
          {
            _start: 36,
            _end: 56,
            kind: 'value',
            op: 'SpecialV',
            args: ['x', 'y'],
          },
        ],
      ],
      _start: 5,
      _end: 58,
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
      _start: 0,
      _end: 75,
      kind: 'hprop',
      op: 'STAR',
      args: [
        'A',
        {
          kind: 'hprop',
          op: 'STAR',
          args: ['B', 'C'],
          _start: 13,
          _end: 29,
        },
        {
          _start: 32,
          _end: 73,
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
      _start: 0,
      _end: 57,
      kind: 'rich-hprop',
      prefix: '(fun x: A => and some more',
      hprop: {
        _start: 37,
        _end: 52,
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
      _start: 0,
      _end: 57,
      kind: 'hprop',
      op: 'PointsTo',
      ctx: 'PRE',
      binder: 'HQ1',
      args: [
        'p1',
        {
          _start: 35,
          _end: 52,
          kind: 'value',
          op: '$isQueue',
          args: ['L1'],
        },
      ],
    },
    '\n',
    {
      _start: 58,
      _end: 230,
      binder: 'HΦ',
      ctx: 'PRE',
      kind: 'hprop',
      op: 'Later',
      args: [
        {
          _start: 84,
          _end: 225,
          kind: 'hprop',
          op: 'Wand',
          args: [
            {
              _start: 93,
              _end: 202,
              kind: 'hprop',
              op: 'Star',
              args: [
                {
                  _start: 102,
                  _end: 160,
                  kind: 'hprop',
                  op: 'PointsTo',
                  args: [
                    'p1',
                    {
                      _start: 120,
                      _end: 158,
                      kind: 'value',
                      op: '$isQueue',
                      args: [
                        {
                          _start: 133,
                          _end: 156,
                          kind: 'value',
                          op: '$list_app',
                          args: ['L1', 'L2'],
                        },
                      ],
                    },
                  ],
                },
                {
                  _start: 163,
                  _end: 200,
                  kind: 'hprop',
                  op: 'PointsTo',
                  args: [
                    'p2',
                    {
                      _start: 181,
                      _end: 198,
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
                _start: 207,
                _end: 223,
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
      kind: 'value',
      op: '$LitV',
      args: ['p1'],
      _start: 283,
      _end: 297,
    },
    ' ',
    {
      kind: 'value',
      op: '$LitV',
      args: ['p2'],
      _start: 298,
      _end: 312,
    },
    ' {{ v, Φ v }}',
  ]);
});

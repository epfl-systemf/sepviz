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
  expect(parse('text ⟬* PRE @ Hφ: ⟬ Opaque ┆ emp ⟭ *⟭ some more text')).toEqual(
    [
      'text ',
      {
        kind: 'hprop',
        op: 'Opaque',
        args: ['emp'],
        binder: 'Hφ',
        ctx: 'PRE',
      },
      ' some more text',
    ]
  );
});

test('parse two regions', () => {
  expect(
    parse(
      '⟬* PRE @ Hφ: ⟬ NULL ┆ emp ⟭ *⟭ code do something (fun r => ⟬* POST @ ⟬ PointsTo ┆ r ┆ isList ┆ l1 ++ l2 ⟭ *⟭) '
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

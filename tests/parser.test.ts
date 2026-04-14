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
  expect(parse('text ⟬ inside the region ⟭ some more text')).toEqual([
    'text ',
    { formula: 'inside the region' },
    ' some more text',
  ]);
});

test('parse one simple named region', () => {
  expect(parse('text ⟬ PRE @ Hφ: inside the region ⟭ some more text')).toEqual([
    'text ',
    { binder: 'Hφ', ctx: 'PRE', formula: 'inside the region' },
    ' some more text',
  ]);
});

test('parse two regions', () => {
  expect(
    parse(
      '⟬ PRE @ Hφ: ⟬ NULL ┆ emp ⟭ ⟭ code do something (fun r => ⟬ POST @ ⟬ PointsTo ┆ r ┆ isList ┆ l1 ++ l2 ⟭⟭) '
    )
  ).toEqual([
    { binder: 'Hφ', ctx: 'PRE', formula: { args: ['emp'], op: 'NULL' } },
    ' code do something (fun r => ',
    {
      ctx: 'POST',
      formula: { args: ['r', 'isList', 'l1 ++ l2'], op: 'PointsTo' },
    },
    ') ',
  ]);
});

test('parse nested formulas', () => {
  expect(
    parse(
      '⟬⟬ STAR ┆ A ┆ ⟬ STAR ┆ B ┆ C ⟭ ┆ ⟬ PointsTo ┆ p: Int ┆ isList ┆ l1 ++ l2 ⟭ ⟭⟭'
    )
  ).toEqual([
    {
      formula: {
        op: 'STAR',
        args: [
          'A',
          { op: 'STAR', args: ['B', 'C'] },
          { op: 'PointsTo', args: ['p: Int', 'isList', 'l1 ++ l2'] },
        ],
      },
    },
  ]);
});

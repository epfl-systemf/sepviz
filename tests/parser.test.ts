import { parse } from '../src/parser';
import type { Goal } from '../src/parser';
import { expect, test } from 'vitest';

test('flatten stars', () => {
  const text =
    'text ⟬ Star ┆ ⟬ Star ┆ A ┆ B ⟭ ┆ ⟬ Conj ┆ E ┆ F ⟭ ┆ ⟬ Star ┆ C ┆ D ⟭ ⟭ some more text';
  const goal: Goal = parse(text);

  expect(goal).toEqual([
    'text ',
    {
      op: 'Stars',
      args: ['A', 'B', { op: 'Conjs', args: ['E', 'F'] }, 'C', 'D'],
    },
    ' some more text',
  ]);
});

test('resolve symbols', () => {
  // instead of `l1 ++ l2`, the rocq output should be ⟦ list_append ┆ l1 ┆ l2 ⟧
  const text =
    '(fun r => ⟬ Exist ┆ l1 ┆ ⟬ PointsTo ┆ r ┆ isList ┆ ⟦ list_append ┆ l1 ┆ l2 ⟧ ⟭ ⟭)';
  const goal: Goal = parse(text);
  expect(goal).toEqual([
    '(fun r => ',
    {
      op: 'PointsTo',
      args: [
        'r',
        'isList',
        {
          op: 'list_append',
          args: [
            {
              isGlobal: false,
              label: 'l10',
              uid: 'l1$0',
            },
            'l2',
          ],
        },
      ],
    },
    ')',
  ]);
});

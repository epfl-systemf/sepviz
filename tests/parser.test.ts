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

test('aggregate pures', () => {
  const text =
    '⟬ Star ┆ ⟬ Star ┆ ⟬ Pure ┆ ⟦ Eq ┆ l1 ┆ l2 ⟧ ⟭ ┆ ⟬ Pure ┆ ⟦ Gt ┆ x ┆ y ⟧ ⟭ ⟭ ┆ A ⟭';
  const goal: Goal = parse(text);
  expect(goal).toEqual([
    {
      op: 'Stars',
      args: [
        {
          op: 'Pures',
          args: [
            { op: 'Pure', args: [{ op: 'Eq', args: ['l1', 'l2'] }] },
            { op: 'Pure', args: [{ op: 'Gt', args: ['x', 'y'] }] },
          ],
        },
        'A',
      ],
    },
  ]);
});

test('pointsto example', () => {
  const text = `⟬ Star ┆ ⟬ PointsTo ┆ p1 ┆ ⟦ $MCell ┆ f1 ┆ b1 ⟧ ⟭
┆ ⟬ Star ┆ ⟬ PointsTo ┆ f2 ┆ ⟦ $MCell ┆ x ┆ c2 ⟧ ⟭
┆ ⟬ Star ┆ ⟬ PointsTo ┆ c2 ┆ ⟦ $MListSeg ┆ b2 ┆ L2' ⟧ ⟭
┆ ⟬ Star ┆ ⟬ PointsTo ┆ p2 ┆ ⟦ $MCell ┆ f2 ┆ b2 ⟧ ⟭
┆ ⟬ Star ┆ ⟬ PointsTo ┆ b2 ┆ ⟦ $MCell ┆ d2 ┆ null ⟧ ⟭
┆ ⟬ Star ┆ ⟬ PointsTo ┆ f1 ┆ ⟦ $MListSeg ┆ b1 ┆ L1 ⟧ ⟭ ┆ ⟬ PointsTo ┆ b1 ┆ ⟦ $MCell ┆ d1 ┆ null ⟧ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭ ⟭`;
  const goal: Goal = parse(text);
  expect(goal).toEqual([
    {
      op: 'Stars',
      args: [
        {
          op: 'PointsTos',
          args: [
            {
              op: 'PointsTo',
              args: ['p1', { op: '$MCell', args: ['f1', 'b1'] }],
            },
            {
              op: 'PointsTo',
              args: ['f2', { op: '$MCell', args: ['x', 'c2'] }],
            },
            {
              op: 'PointsTo',
              args: ['c2', { op: '$MListSeg', args: ['b2', "L2'"] }],
            },
            {
              op: 'PointsTo',
              args: ['p2', { op: '$MCell', args: ['f2', 'b2'] }],
            },
            {
              op: 'PointsTo',
              args: ['b2', { op: '$MCell', args: ['d2', 'null'] }],
            },
            {
              op: 'PointsTo',
              args: ['f1', { op: '$MListSeg', args: ['b1', 'L1'] }],
            },
            {
              op: 'PointsTo',
              args: ['b1', { op: '$MCell', args: ['d1', 'null'] }],
            },
          ],
        },
      ],
    },
  ]);
});

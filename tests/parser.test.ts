import { Parser, Goal, HProp, HProp_PointsTo, Symbol } from '../src/parser';
import { expect, test } from 'vitest';

const valueConfig = {
  '@plus': {
    argNum: 2,
    pattern: '$1 + $2',
  },
  '@list_append': {
    argNum: 2,
    pattern: '$1 ++ $2',
  },
  '@eq': {
    argNum: 2,
    pattern: '$1 == $2',
  },
  '@gt': {
    argNum: 2,
    pattern: '$1 > $2',
  },
};
const parser = new Parser({ value: valueConfig }); // FIXME

test('flatten stars', () => {
  const text =
    'text ⟬ Star ┆ ⟬ Star ┆ A ┆ B ⟭ ┆ ⟬ Conj ┆ E ┆ F ⟭ ┆ ⟬ Star ┆ C ┆ D ⟭ ⟭ some more text';
  const goal: Goal = parser.parse(text);

  expect(goal).toEqual([
    'text ',
    new HProp('Stars', ['A', 'B', new HProp('Conjs', ['E', 'F']), 'C', 'D']),
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
    new HProp_PointsTo('PointsTo', 'r', 'isList', [
      {
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
    new HProp('Stars', [
      new HProp('Pures', [
        new HProp('Pure', [
          {
            op: '@eq',
            args: ['l1', 'l2'],
            uid: '@eq-l1-l2',
            label: 'l1 == l2',
          },
        ]),
        new HProp('Pure', [
          {
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
    new HProp('Stars', [
      new HProp('PointsTos', [
        new HProp_PointsTo('PointsTo', 'p1', '@MCell', ['f1', 'b1']),
        new HProp_PointsTo('PointsTo', 'f2', '@MCell', ['x', 'c2']),
        new HProp_PointsTo('PointsTo', 'c2', '@MListSeg', ['b2', "L2'"]),
        new HProp_PointsTo('PointsTo', 'p2', '@MCell', ['f2', 'b2']),
        new HProp_PointsTo('PointsTo', 'b2', '@MCell', ['d2', 'null']),
        new HProp_PointsTo('PointsTo', 'f1', '@MListSeg', ['b1', 'L1']),
        new HProp_PointsTo('PointsTo', 'b1', '@MCell', ['d1', 'null']),
      ]),
    ]),
  ]);
});

test('term array', () => {
  const text = '⟬ Pure ┆ l3 = ┆ ⟦ @eq ┆ l1 ┆ l2 ⟧ ⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    new HProp('Pures', [
      new HProp('Pure', [
        'l3 =',
        { op: '@eq', args: ['l1', 'l2'], uid: '@eq-l1-l2', label: 'l1 == l2' },
      ]),
    ]),
  ]);
});

test('pointsto with loc being value', () => {
  // p + 1  ->  l1 ++ l2
  const text =
    '⟬ PointsTo ┆ ⟦ @plus ┆ p ┆ 1 ⟧ ┆ ⟦ isList ┆ ⟦ @list_append ┆ l1 ┆ l2 ⟧ ⟧ ⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    new HProp('PointsTos', [
      new HProp_PointsTo(
        'PointsTo',
        new Symbol(true, '@plus-p-1', 'p + 1'),
        'isList',
        [
          {
            op: '@list_append',
            args: ['l1', 'l2'],
            label: 'l1 ++ l2',
            uid: '@list_append-l1-l2',
          },
        ]
      ),
    ]),
  ]);
});

test('cfml triple', () => {
  const text = '⟬* POST @ (fun x: A => and some more ⟬ Opaque ┆ GC ⟭ ) *⟭';
  const goal: Goal = parser.parse(text);
  expect(goal).toEqual([
    '(fun x: A => and some more',
    new HProp('Opaque', ['GC'], 'POST'),
    ')',
  ]);
});

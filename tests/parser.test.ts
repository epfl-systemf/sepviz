import {
  parse,
  Goal,
  HProp,
  HProp_PointsTo,
  Value,
  Symbol,
} from '../src/parser';
import { expect, test } from 'vitest';

test('flatten stars', () => {
  const text =
    'text ⟬ Star ┆ ⟬ Star ┆ A ┆ B ⟭ ┆ ⟬ Conj ┆ E ┆ F ⟭ ┆ ⟬ Star ┆ C ┆ D ⟭ ⟭ some more text';
  const goal: Goal = parse(text);

  expect(goal).toEqual([
    'text ',
    new HProp('Stars', ['A', 'B', new HProp('Conjs', ['E', 'F']), 'C', 'D']),
    ' some more text',
  ]);
});

test('resolve symbols', () => {
  // instead of `l1 ++ l2`, the rocq output should be ⟦ list_append ┆ l1 ┆ l2 ⟧
  const text =
    '(fun r => ⟬ Exist ┆ l1 ┆ ⟬ PointsTo ┆ r ┆ ⟦ isList ┆ ⟦ list_append ┆ l1 ┆ l2 ⟧ ⟧ ⟭ ⟭)';
  const goal: Goal = parse(text);
  expect(goal).toEqual([
    '(fun r => ',
    new HProp_PointsTo('PointsTo', 'r', 'isList', [
      new Value('list_append', [new Symbol(false, 'l1$0', 'l10'), 'l2']),
    ]),
    ')',
  ]);
});

test('aggregate pures', () => {
  const text =
    '⟬ Star ┆ ⟬ Star ┆ ⟬ Pure ┆ ⟦ Eq ┆ l1 ┆ l2 ⟧ ⟭ ┆ ⟬ Pure ┆ ⟦ Gt ┆ x ┆ y ⟧ ⟭ ⟭ ┆ A ⟭';
  const goal: Goal = parse(text);
  expect(goal).toEqual([
    new HProp('Stars', [
      new HProp('Pures', [
        new HProp('Pure', [new Value('Eq', ['l1', 'l2'])]),
        new HProp('Pure', [new Value('Gt', ['x', 'y'])]),
      ]),
      'A',
    ]),
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
    new HProp('Stars', [
      new HProp('PointsTos', [
        new HProp_PointsTo('PointsTo', 'p1', '$MCell', ['f1', 'b1']),
        new HProp_PointsTo('PointsTo', 'f2', '$MCell', ['x', 'c2']),
        new HProp_PointsTo('PointsTo', 'c2', '$MListSeg', ['b2', "L2'"]),
        new HProp_PointsTo('PointsTo', 'p2', '$MCell', ['f2', 'b2']),
        new HProp_PointsTo('PointsTo', 'b2', '$MCell', ['d2', 'null']),
        new HProp_PointsTo('PointsTo', 'f1', '$MListSeg', ['b1', 'L1']),
        new HProp_PointsTo('PointsTo', 'b1', '$MCell', ['d1', 'null']),
      ]),
    ]),
  ]);
});

test('term array', () => {
  const text = '⟬ Pure ┆ l3 = ┆ ⟦ Eq ┆ l1 ┆ l2 ⟧ ⟭';
  const goal: Goal = parse(text);
  expect(goal).toEqual([
    new HProp('Pure', ['l3 =', new Value('Eq', ['l1', 'l2'])]),
  ]);
});

test('pointsto with loc being value', () => {
  // p + 1  ->  l1 ++ l2
  const text = '⟬ PointsTo ┆ ⟦ plus ┆ p ┆ 1 ⟧ ┆ ⟦ list_append ┆ l1 ┆ l2 ⟧ ⟭';
  const goal: Goal = parse(text);
  expect(goal).toEqual([
    new HProp_PointsTo(
      'PointsTo',
      new Symbol(true, 'plus-p-1', 'plus p 1'),
      'list_append',
      ['l1', 'l2']
    ),
  ]);
});

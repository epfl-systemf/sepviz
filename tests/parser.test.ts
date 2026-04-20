import { parse, Goal, HProp, Value, Symbol } from '../src/parser';
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
    '(fun r => ⟬ Exist ┆ l1 ┆ ⟬ PointsTo ┆ r ┆ isList ┆ ⟦ list_append ┆ l1 ┆ l2 ⟧ ⟭ ⟭)';
  const goal: Goal = parse(text);
  expect(goal).toEqual([
    '(fun r => ',
    new HProp('PointsTo', [
      'r',
      'isList',
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
        new HProp('PointsTo', ['p1', new Value('$MCell', ['f1', 'b1'])]),
        new HProp('PointsTo', ['f2', new Value('$MCell', ['x', 'c2'])]),
        new HProp('PointsTo', ['c2', new Value('$MListSeg', ['b2', "L2'"])]),
        new HProp('PointsTo', ['p2', new Value('$MCell', ['f2', 'b2'])]),
        new HProp('PointsTo', ['b2', new Value('$MCell', ['d2', 'null'])]),
        new HProp('PointsTo', ['f1', new Value('$MListSeg', ['b1', 'L1'])]),
        new HProp('PointsTo', ['b1', new Value('$MCell', ['d1', 'null'])]),
      ]),
    ]),
  ]);
});

test('test', () => {
  const text = '⟬ Pure ┆ l3 = ┆ ⟦ Eq ┆ l1 ┆ l2 ⟧ ⟭';
  const goal: Goal = parse(text);
  expect(goal).toEqual([
    new HProp('Pure', ['l3 =', new Value('Eq', ['l1', 'l2'])]),
  ]);
});

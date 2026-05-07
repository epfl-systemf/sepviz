import { expect, test } from 'vitest';
import { sort } from '../src/sort';

test('the sorted result respects the previous order if passed', () => {
  const previousOrder = {
    b: 0,
    f: 1,
  };
  const nodes = ['a', 'b', 'C', 'd', 'e', 'f', 'g', 'h', 'i'];
  const edges = [
    // a -> f -> c -> d; d -> f; d -> e;
    // a -> b -> g -> h -> b; g -> i;
    { src: 'a', dst: 'f' },
    { src: 'f', dst: 'C' },
    { src: 'C', dst: 'd' },
    { src: 'd', dst: 'f' },
    { src: 'd', dst: 'e' },
    { src: 'a', dst: 'b' },
    { src: 'b', dst: 'g' },
    { src: 'g', dst: 'h' },
    { src: 'h', dst: 'b' },
    { src: 'g', dst: 'i' },
  ];
  const res = sort('a', nodes, edges, previousOrder);
  expect(res).toEqual({
    a: 0,
    b: 1,
    g: 2,
    h: 3,
    f: 4,
    C: 5,
    d: 6,
    e: 7,
    i: 8,
  });
});

test('the given root should be the first even if there are multiple roots', () => {
  const nodes = ['p1', 'f1', 'b1', 'c2', 'b2', 'p2', 'f2'];
  const edges = [
    { src: 'p1', dst: 'f1' },
    { src: 'f1', dst: 'b1' },
    { src: 'b1', dst: 'c2' },
    { src: 'c2', dst: 'b2' },
    { src: 'p1', dst: 'b1' },
    { src: 'p2', dst: 'f2' },
    { src: 'f2', dst: 'c2' },
    { src: 'p2', dst: 'b2' },
  ];
  const res = sort('p1', nodes, edges, null);
  expect(res).toEqual({
    p1: 0,
    f1: 1,
    b1: 2,
    p2: 3,
    f2: 4,
    c2: 5,
    b2: 6,
  });
});

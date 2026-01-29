import { describe, expect, test } from 'vitest';
import { sort } from '../src/sort';

describe('testing sort', () => {
  test('the sorted result should respect the previous order', () => {
    const previousOrder = {
      f: 0,
      b: 1,
    };
    const nodes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    const edges = [
      { src: 'a', dst: 'f' },
      { src: 'f', dst: 'c' },
      { src: 'c', dst: 'd' },
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
      f: 1,
      c: 2,
      d: 3,
      e: 4,
      b: 5,
      g: 6,
      h: 7,
      i: 8,
    });
  });
});

describe('testing sort', () => {
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
      p2: 1,
      f2: 2,
      f1: 3,
      b1: 4,
      c2: 5,
      b2: 6,
    });
  });
});

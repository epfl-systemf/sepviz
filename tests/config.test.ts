import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadRenderConfig, defaultRenderConfig } from '../src/config';

const mockFetch = (text: string, ok = true) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      statusText: 'Not Found',
      text: () => Promise.resolve(text),
    })
  );
};

describe('loadRenderConfig', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('loads and merges config', async () => {
    const yaml = `
constr:
  TestConstr:
  isCell:
    drawBorder: true
    argNum: 2
`.trim();
    mockFetch(yaml);
    const config = await loadRenderConfig();
    expect(fetch).toHaveBeenCalledWith('renderConfig.yaml');
    expect(config).toEqual({
      ...defaultRenderConfig(),
      constr: {
        TestConstr: {
          argNum: 0,
          args: {},
          drawBorder: false,
          inPort: null,
        },
        isCell: {
          argNum: 2,
          args: {
            '0': {
              forceEdge: false,
              inPort: 'in$0',
              inTable: true,
              outPort: 'out$0',
            },
            '1': {
              forceEdge: false,
              inPort: 'in$1',
              inTable: true,
              outPort: 'out$1',
            },
          },
          drawBorder: true,
          inPort: 'in$0',
        },
      },
    });
  });
});

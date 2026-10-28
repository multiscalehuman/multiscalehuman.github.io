import { toPathData, toPointList } from './svg-path';

describe('toPathData', () => {
  it('draws one move command per polyline and skips polylines with fewer than two points', () => {
    expect(
      toPathData([
        [
          { x: 0, y: 1 },
          { x: 2, y: 3 },
          { x: 4.5, y: 5 },
        ],
        [{ x: 9, y: 9 }],
        [],
        [
          { x: 6, y: 7 },
          { x: 8, y: 9 },
        ],
      ]),
    ).toBe('M0 1L2 3L4.5 5M6 7L8 9');
  });

  it('returns empty path data when nothing can be drawn', () => {
    expect(toPathData([])).toBe('');
  });
});

describe('toPointList', () => {
  it('formats points as space-separated pairs', () => {
    expect(
      toPointList([
        { x: 0, y: 1 },
        { x: 2.5, y: 3 },
      ]),
    ).toBe('0,1 2.5,3');
  });
});

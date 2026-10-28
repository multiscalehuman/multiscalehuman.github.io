import { timeAxis } from '../../testing/geometry-fixtures';
import { getProjectedBoxGeometry, getRenderedTimeExtent } from './box';

describe('block geometry', () => {
  it('getRenderedTimeExtent keeps long ranges exact and grows short ranges to a cube', () => {
    expect(getRenderedTimeExtent({ start: 7, end: 47 }, timeAxis, 0.175)).toEqual({ y0: 0.07, y1: 0.47 });
    const single = getRenderedTimeExtent({ start: 45, end: 45 }, timeAxis, 0.175);
    expect(Math.abs(single.y1 - single.y0 - 0.175)).toBeLessThan(1e-9);
    expect(Math.abs((single.y0 + single.y1) / 2 - 0.45)).toBeLessThan(1e-9);
  });

  it('getRenderedTimeExtent shifts edge blocks inward instead of clipping them', () => {
    const infant = getRenderedTimeExtent({ start: 4 / 12, end: 5 / 12 }, timeAxis, 0.175);
    expect(infant.y0).toBe(0);
    expect(Math.abs(infant.y1 - 0.175)).toBeLessThan(1e-9);
    const oldest = getRenderedTimeExtent({ start: 100, end: 100 }, timeAxis, 0.175);
    expect(oldest.y1).toBe(1);
    expect(Math.abs(oldest.y1 - oldest.y0 - 0.175)).toBeLessThan(1e-9);
  });

  it('getProjectedBoxGeometry returns positive bounds around every corner', () => {
    const geometry = getProjectedBoxGeometry({ x0: 0.2, x1: 0.4, y0: 0.1, y1: 0.7, z0: 0.5, z1: 0.7 });
    const corners = Object.values(geometry.corners);

    expect(geometry.bounds.width).toBeGreaterThan(0);
    expect(geometry.bounds.height).toBeGreaterThan(0);
    expect(corners.every((point) => point.x >= geometry.bounds.left)).toBe(true);
    expect(corners.every((point) => point.x <= geometry.bounds.left + geometry.bounds.width)).toBe(true);
    expect(corners.every((point) => point.y >= geometry.bounds.top)).toBe(true);
    expect(corners.every((point) => point.y <= geometry.bounds.top + geometry.bounds.height)).toBe(true);
  });
});

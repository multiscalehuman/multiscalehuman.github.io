import { axes, timeAxis } from '../../testing/geometry-fixtures';
import {
  getAxisEdges,
  getAxisLayout,
  getCategoryCenter,
  getFootprintHalfSize,
  getFrameEdges,
  getSpreadCenter,
  getTimeCoordinate,
  projectPoint,
} from './projection';

describe('projection', () => {
  it('getCategoryCenter centers indexes within equal categorical cells', () => {
    expect(getCategoryCenter(0, 2)).toBe(0.25);
    expect(getCategoryCenter(1, 2)).toBe(0.75);
  });

  it('getSpreadCenter separates two space values well beyond equal-width cells', () => {
    const halfSize = getFootprintHalfSize(2, 4);
    const first = getSpreadCenter(0, 2, halfSize);
    const second = getSpreadCenter(1, 2, halfSize);

    expect(second - first).toBeGreaterThan(getCategoryCenter(1, 2) - getCategoryCenter(0, 2));
    expect(Math.abs(first + second - 1), 'Spread values stay symmetric.').toBeLessThan(1e-9);
    expect(first - halfSize > 0 && second + halfSize < 1, 'Blocks stay inside the frame.').toBe(true);
    expect(getSpreadCenter(0, 1, halfSize)).toBe(0.5);
  });

  it('getSpreadCenter never packs many values tighter than equal-width cells', () => {
    const halfSize = getFootprintHalfSize(8, 4);

    for (let index = 0; index < 8; index += 1) {
      expect(Math.abs(getSpreadCenter(index, 8, halfSize) - getCategoryCenter(index, 8))).toBeLessThan(1e-9);
    }
  });

  it('getAxisLayout places the first space value in the back row and gives each organ its own lane band', () => {
    const layout = getAxisLayout(axes);

    expect(layout.space[0], 'The first space value sits toward x = 1, the back row.').toBeGreaterThan(layout.space[1]);
    expect(layout.organ).toEqual([0.125, 0.375, 0.625, 0.875]);
    expect(layout.organBands).toEqual([
      [0, 0.25],
      [0.25, 0.5],
      [0.5, 0.75],
      [0.75, 1],
    ]);
  });

  it('getFrameEdges projects all twelve edges of the bounding cube', () => {
    const edges = getFrameEdges();
    const frontEdge = edges.find(
      ([start, end]) =>
        start.x === projectPoint(0, 0, 0).x &&
        start.y === projectPoint(0, 0, 0).y &&
        end.x === projectPoint(0, 1, 0).x &&
        end.y === projectPoint(0, 1, 0).y,
    );

    expect(edges.length).toBe(12);
    expect(frontEdge, 'The front vertical edge is part of the frame.').toBeTruthy();
  });

  it('getAxisEdges points every label direction away from the cube', () => {
    const { time, space, organ } = getAxisEdges();
    [time, space, organ].forEach(({ normal }) =>
      expect(Math.abs(Math.hypot(normal.x, normal.y) - 1)).toBeLessThan(1e-9),
    );

    expect(time.normal.x, 'Time ticks sit to the left of the left edge.').toBeLessThan(-0.9);
    expect(space.normal.x, 'Space labels sit to the right of the right floor edge.').toBeGreaterThan(0);
    expect(time.end).toEqual(projectPoint(0, 1, 0));
  });

  it('getTimeCoordinate maps the time domain onto the vertical axis', () => {
    expect(getTimeCoordinate(0, timeAxis)).toBe(0);
    expect(getTimeCoordinate(45, timeAxis)).toBe(0.45);
    expect(getTimeCoordinate(100, timeAxis)).toBe(1);
  });

  it('getFootprintHalfSize sizes blocks from the denser categorical axis', () => {
    expect(getFootprintHalfSize(2, 4)).toBe(getFootprintHalfSize(4, 2));
    expect(getFootprintHalfSize(2, 4)).toBeLessThan(getFootprintHalfSize(2, 2));
  });

  it('projectPoint returns finite perspective coordinates', () => {
    const point = projectPoint(0.5, 0.5, 0.5);

    expect(Number.isFinite(point.x)).toBe(true);
    expect(Number.isFinite(point.y)).toBe(true);
    expect(point.x > 0 && point.x < 100).toBe(true);
    expect(point.y > 0 && point.y < 100).toBe(true);
  });
});

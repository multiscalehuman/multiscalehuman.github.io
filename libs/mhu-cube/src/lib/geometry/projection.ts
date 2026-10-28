import type { MhuCubeAxes, MhuCubeTimeAxis } from '../types';
import type { AxisEdge, AxisLayout, Point } from './types';
import { CUBE_EDGES, VIEW, interpolatePlane, type FloorCorner } from './view';

// Share of a categorical cell covered by a block's footprint.
const FOOTPRINT_FILL = 0.7;
// Gap kept between the outermost space blocks and the frame.
const SPACE_EDGE_MARGIN = 0.07;

/**
 * Places a categorical index at the center of its equal-width axis cell.
 * @param value - Zero-based category index.
 * @param count - Total categories on the axis.
 * @returns A normalized position between zero and one.
 */
export function getCategoryCenter(value: number, count: number): number {
  return count > 0 ? (value + 0.5) / count : 0.5;
}

/**
 * Spreads a few categories toward the ends of an axis so their blocks read as distinct groups.
 * @param value - Zero-based category index.
 * @param count - Total categories on the axis.
 * @param halfSize - Half of a block's footprint, used to keep blocks inside the frame.
 * @returns A normalized position between zero and one; never closer together than equal-width cells.
 */
export function getSpreadCenter(value: number, count: number, halfSize: number): number {
  if (count <= 1) {
    return 0.5;
  }
  const inset = Math.min(0.5 / count, halfSize + SPACE_EDGE_MARGIN);
  return inset + (value * (1 - 2 * inset)) / (count - 1);
}

/**
 * Projects normalized coordinates onto the plot.
 * @param x - Normalized space position.
 * @param y - Normalized time position.
 * @param z - Normalized organ position.
 * @returns A percentage coordinate inside the visualization frame.
 */
export function projectPoint(x: number, y: number, z: number): Point {
  const { planes } = VIEW;
  const top = interpolatePlane(planes.top, x, z);
  const bottom = interpolatePlane(planes.bottom, x, z);
  return {
    x: bottom.x + (top.x - bottom.x) * y,
    y: bottom.y + (top.y - bottom.y) * y,
  };
}

/**
 * Maps a time value onto the vertical axis.
 * @param value - Time in axis units.
 * @param axis - Validated time axis with a positive span.
 * @returns A normalized height between zero and one for in-range values.
 */
export function getTimeCoordinate(value: number, axis: MhuCubeTimeAxis): number {
  return (value - axis.min) / (axis.max - axis.min);
}

/**
 * Sizes block footprints from the denser categorical axis.
 * @param spaceCount - Number of space categories.
 * @param organCount - Number of organ categories.
 * @returns Half of a full-width block's normalized footprint.
 */
export function getFootprintHalfSize(spaceCount: number, organCount: number): number {
  return (0.5 / Math.max(spaceCount, organCount, 1)) * FOOTPRINT_FILL;
}

/**
 * Positions every space and organ category on the floor; labels, guides, and blocks all share these centers.
 * @param axes - Validated, plottable axes.
 * @returns Footprint size, spread space centers, organ centers, and the bands each organ's lanes may use.
 */
export function getAxisLayout(axes: MhuCubeAxes): AxisLayout {
  const spaceCount = axes.space.values.length;
  const organCount = axes.organ.values.length;
  const halfSize = getFootprintHalfSize(spaceCount, organCount);
  // Space runs from x = 0 to x = 1 with the first value nearest x = 1, the back row.
  const space = axes.space.values.map((_, index) => 1 - getSpreadCenter(index, spaceCount, halfSize));
  const organ = axes.organ.values.map((_, index) => getCategoryCenter(index, organCount));
  const organBands = organ.map((center): [number, number] => [center - 0.5 / organCount, center + 0.5 / organCount]);
  return { halfSize, space, organ, organBands };
}

/**
 * Projects the twelve edges of the bounding cube so the frame and its contents share one projection.
 * @returns Start and end points of each frame edge in plot percentages.
 */
export function getFrameEdges(): [Point, Point][] {
  return CUBE_EDGES.map(([start, end]) => [projectPoint(...start), projectPoint(...end)]);
}

/**
 * Traces one time level across the two walls farthest from the camera, starting at the time ticks.
 * @param y - Normalized time height.
 * @returns The guide's three projected points: the tick edge, the far corner, and the wall's other end.
 */
export function getTimeGuide(y: number): Point[] {
  const { near, ticks } = VIEW;
  const far: FloorCorner = [near[0] === 0 ? 1 : 0, near[1] === 0 ? 1 : 0];
  // The fourth floor corner closes the far walls: it is neither the near, tick, nor far corner.
  const remaining: FloorCorner = [far[0] === ticks[0] ? near[0] : far[0], far[1] === ticks[1] ? near[1] : far[1]];
  return [ticks, far, remaining].map(([x, z]) => projectPoint(x, y, z));
}

/**
 * Finds the on-screen direction pointing straight away from a frame edge, away from the cube.
 * @param start - One end of the edge in plot percentages.
 * @param end - The other end of the edge in plot percentages.
 * @returns A unit vector in screen space, correcting for the plot's non-square percentages.
 */
export function getOutwardNormal(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const { heightRatio } = VIEW;
  const dy = (end.y - start.y) * heightRatio;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: dy / length, y: -dx / length };
  const center = projectPoint(0.5, 0.5, 0.5);
  const outward = { x: (start.x + end.x) / 2 - center.x, y: ((start.y + end.y) / 2 - center.y) * heightRatio };
  return normal.x * outward.x + normal.y * outward.y < 0 ? { x: -normal.x, y: -normal.y } : normal;
}

/**
 * Locates the three labeled frame edges and the direction their labels sit away from the cube.
 * Points along each edge are linear in that axis's normalized coordinate.
 * @returns For each axis, its edge's start and end points in plot percentages and its outward unit normal.
 */
export function getAxisEdges(): Record<keyof MhuCubeAxes, AxisEdge> {
  const { near, ticks } = VIEW;
  const edge = (start: [number, number, number], end: [number, number, number]): AxisEdge => {
    const from = projectPoint(...start);
    const to = projectPoint(...end);
    return { start: from, end: to, normal: getOutwardNormal(from, to) };
  };
  return {
    // Time ticks run up the leftmost vertical edge; space and organ labels run along the floor edges nearest the camera.
    time: edge([ticks[0], 0, ticks[1]], [ticks[0], 1, ticks[1]]),
    space: edge([0, 0, near[1]], [1, 0, near[1]]),
    organ: edge([near[0], 0, 0], [near[0], 0, 1]),
  };
}

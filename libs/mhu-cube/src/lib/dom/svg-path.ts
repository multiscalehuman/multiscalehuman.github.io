import type { Point } from '../geometry/types';

/**
 * Builds SVG path data in plot percentages, the coordinate space shared by the frame and every block.
 * @param segments - Polylines to draw, each a list of projected points; those with fewer than two points are skipped.
 * @returns Path data with one move command per polyline.
 */
export function toPathData(segments: readonly (readonly Point[])[]): string {
  return segments
    .filter((points) => points.length > 1)
    .map((points) => points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(''))
    .join('');
}

/**
 * Formats points for an SVG `points` attribute, as used by polygons and polylines.
 * @param points - Projected points in drawing order.
 * @returns Space-separated `x,y` pairs.
 */
export function toPointList(points: readonly Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

import type { MhuCubeTimeAxis, MhuCubeTimeRange } from '../types';
import { projectPoint, getTimeCoordinate } from './projection';
import type { Box, ProjectedBoxGeometry } from './types';
import { VIEW } from './view';

/**
 * Converts a time range to a drawn vertical extent, keeping short ranges and single ages cube-height.
 * @param range - Validated time range inside the axis domain.
 * @param axis - Validated time axis with a positive span.
 * @param minHeight - Smallest drawn height; ranges shorter than this grow around their midpoint.
 * @returns Normalized bottom and top heights, shifted inward rather than clipped at the axis ends.
 */
export function getRenderedTimeExtent(range: MhuCubeTimeRange, axis: MhuCubeTimeAxis, minHeight: number) {
  const start = getTimeCoordinate(range.start, axis);
  const end = getTimeCoordinate(range.end, axis);
  if (end - start >= minHeight) {
    return { y0: start, y1: end };
  }
  const height = Math.min(minHeight, 1);
  const y0 = Math.min(Math.max((start + end) / 2 - height / 2, 0), 1 - height);
  return { y0, y1: y0 + height };
}

/**
 * Finds a block's floor corners relative to the camera.
 * @param box - Normalized block extents.
 * @returns The nearest corner, the corner across the space axis, the corner across the organ axis, and the far corner.
 */
export function getNearCorners(box: Box) {
  const [nearX, nearZ] = VIEW.near;
  const xNear = nearX === 0 ? box.x0 : box.x1;
  const xFar = nearX === 0 ? box.x1 : box.x0;
  const zNear = nearZ === 0 ? box.z0 : box.z1;
  const zFar = nearZ === 0 ? box.z1 : box.z0;
  return { front: [xNear, zNear], left: [xFar, zNear], right: [xNear, zFar], back: [xFar, zFar] } as const;
}

/**
 * Computes projected corners and bounds for a block.
 * @param box - Normalized block extents.
 * @returns Projected corners and percentage bounds.
 */
export function getProjectedBoxGeometry(box: Box): ProjectedBoxGeometry {
  const { front, left, right, back } = getNearCorners(box);
  const corners = {
    topFront: projectPoint(front[0], box.y1, front[1]),
    topLeft: projectPoint(left[0], box.y1, left[1]),
    topBack: projectPoint(back[0], box.y1, back[1]),
    topRight: projectPoint(right[0], box.y1, right[1]),
    bottomFront: projectPoint(front[0], box.y0, front[1]),
    bottomLeft: projectPoint(left[0], box.y0, left[1]),
    bottomRight: projectPoint(right[0], box.y0, right[1]),
  };
  const points = Object.values(corners);
  const padding = 0.3;
  const minX = Math.min(...points.map((point) => point.x)) - padding;
  const minY = Math.min(...points.map((point) => point.y)) - padding;
  const maxX = Math.max(...points.map((point) => point.x)) + padding;
  const maxY = Math.max(...points.map((point) => point.y)) + padding;
  return { corners, bounds: { left: minX, top: minY, width: maxX - minX, height: maxY - minY } };
}

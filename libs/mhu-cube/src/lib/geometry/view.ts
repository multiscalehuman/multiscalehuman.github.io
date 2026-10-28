import type { Point } from './types';

/** A floor corner as [x, z], each zero or one. */
export type FloorCorner = [0 | 1, 0 | 1];

/** A horizontal face of the bounding cube in plot percentages, keyed by floor corner. */
interface FramePlane {
  x0z0: Point;
  x1z0: Point;
  x1z1: Point;
  x0z1: Point;
}

/** The camera: where the bounding cube is drawn and which corners face the viewer and carry the time ticks. */
interface ViewDefinition {
  /** The bounding cube's bottom and top faces, in drawing-area percentages. */
  planes: { bottom: FramePlane; top: FramePlane };
  /** Drawing-area height as a share of its width, matching the frame's on-screen shape. */
  heightRatio: number;
  /** Floor corner nearest the camera; the block faces that meet there are the visible ones. */
  near: FloorCorner;
  /** Floor corner whose vertical edge carries the time ticks, the leftmost on screen. */
  ticks: FloorCorner;
}

// The camera's frame is drawn in a 1000 × 868 space, then fitted to its own drawing area.
const DESIGN_HEIGHT_RATIO = 0.868;

/**
 * Fits the camera's frame to a drawing area of the same shape, so the frame touches all four sides. Labels hang
 * outside the area in rem gutters set by CSS.
 * @param planes - The frame's top and bottom faces in percentages of the 1000 × 868 design space.
 * @returns The faces in drawing-area percentages, and the area's height as a share of its width.
 */
function fitFrame(planes: ViewDefinition['planes']): Pick<ViewDefinition, 'planes' | 'heightRatio'> {
  const points = [...Object.values(planes.top), ...Object.values(planes.bottom)];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const width = Math.max(...xs) - left;
  const height = Math.max(...ys) - top;
  const fit = (point: Point): Point => ({ x: ((point.x - left) / width) * 100, y: ((point.y - top) / height) * 100 });
  const fitPlane = (plane: FramePlane): FramePlane => ({
    x0z0: fit(plane.x0z0),
    x1z0: fit(plane.x1z0),
    x1z1: fit(plane.x1z1),
    x0z1: fit(plane.x0z1),
  });
  return {
    planes: { top: fitPlane(planes.top), bottom: fitPlane(planes.bottom) },
    heightRatio: (height * DESIGN_HEIGHT_RATIO) / width,
  };
}

// Faces the organ axis from above and slightly right of it: organs run left to right along the front, time runs
// straight up, and space recedes mostly upward. The small sideways shift keeps each organ's rows in its own
// column; front-row heights read against the ticks and back-row heights against the back-wall time lines.
// Overlapping datasets sit side by side within their organ.
export const VIEW: ViewDefinition = {
  ...fitFrame({
    top: { x0z0: { x: 16, y: 18 }, x1z0: { x: 20, y: 10 }, x1z1: { x: 82, y: 10 }, x0z1: { x: 78, y: 18 } },
    bottom: { x0z0: { x: 16, y: 86 }, x1z0: { x: 20, y: 78 }, x1z1: { x: 82, y: 78 }, x0z1: { x: 78, y: 86 } },
  }),
  near: [0, 1],
  ticks: [0, 0],
};

/** The drawing area's height as a share of its width; the element passes it to CSS so the plot keeps the frame's proportions. */
export const DRAWING_AREA_RATIO = VIEW.heightRatio;

// Every edge of the unit cube as pairs of [x, y, z] corners.
export const CUBE_EDGES: [[number, number, number], [number, number, number]][] = [
  [
    [0, 0, 0],
    [1, 0, 0],
  ],
  [
    [0, 0, 1],
    [1, 0, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 0],
  ],
  [
    [0, 1, 1],
    [1, 1, 1],
  ],
  [
    [0, 0, 0],
    [0, 0, 1],
  ],
  [
    [1, 0, 0],
    [1, 0, 1],
  ],
  [
    [0, 1, 0],
    [0, 1, 1],
  ],
  [
    [1, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 0],
    [0, 1, 0],
  ],
  [
    [1, 0, 0],
    [1, 1, 0],
  ],
  [
    [0, 0, 1],
    [0, 1, 1],
  ],
  [
    [1, 0, 1],
    [1, 1, 1],
  ],
];

/**
 * Blends a horizontal frame face's four corners to find a floor position on that face.
 * @param plane - The frame face in plot percentages.
 * @param x - Normalized space position.
 * @param z - Normalized organ position.
 * @returns The bilinearly interpolated point in plot percentages.
 */
export function interpolatePlane(plane: FramePlane, x: number, z: number): Point {
  const weights = {
    x0z0: (1 - x) * (1 - z),
    x1z0: x * (1 - z),
    x1z1: x * z,
    x0z1: (1 - x) * z,
  };
  return {
    x:
      plane.x0z0.x * weights.x0z0 +
      plane.x1z0.x * weights.x1z0 +
      plane.x1z1.x * weights.x1z1 +
      plane.x0z1.x * weights.x0z1,
    y:
      plane.x0z0.y * weights.x0z0 +
      plane.x1z0.y * weights.x1z0 +
      plane.x1z1.y * weights.x1z1 +
      plane.x0z1.y * weights.x0z1,
  };
}

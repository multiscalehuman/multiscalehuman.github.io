import type { PlotLayout, Point, ProjectedBoxGeometry } from '../geometry/types';
import { createSvgElement, toPathData } from './svg';

/**
 * Draws a block's three visible faces from its projected corners; tall blocks become rectangular prisms.
 * @param geometry - Projected corners and percentage bounds from the plot layout.
 * @returns The decorative block SVG.
 */
export function createProjectedCube({ corners, bounds }: ProjectedBoxGeometry) {
  const pointList = (...facePoints: Point[]) => facePoints.map((point) => `${point.x},${point.y}`).join(' ');
  const path = (...pathPoints: Point[]) =>
    pathPoints.map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join('');
  const svg = createSvgElement('svg', {
    class: 'mhu-cube__cube',
    viewBox: `${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`,
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
  });
  const topFace = [corners.topFront, corners.topLeft, corners.topBack, corners.topRight];
  const leftFace = [corners.topFront, corners.topLeft, corners.bottomLeft, corners.bottomFront];
  const rightFace = [corners.topFront, corners.topRight, corners.bottomRight, corners.bottomFront];
  svg.append(
    createSvgElement('polygon', {
      class: 'mhu-cube__top',
      points: pointList(...topFace),
      'vector-effect': 'non-scaling-stroke',
    }),
    createSvgElement('polygon', {
      class: 'mhu-cube__left',
      points: pointList(...leftFace),
      'vector-effect': 'non-scaling-stroke',
    }),
    createSvgElement('polygon', {
      class: 'mhu-cube__right',
      points: pointList(...rightFace),
      'vector-effect': 'non-scaling-stroke',
    }),
    createSvgElement('path', {
      class: 'mhu-cube__edge',
      d: [
        path(corners.topFront, corners.topBack),
        path(corners.topLeft, corners.topRight),
        path(corners.topFront, corners.bottomLeft),
        path(corners.topLeft, corners.bottomFront),
        path(corners.topFront, corners.bottomRight),
        path(corners.topRight, corners.bottomFront),
      ].join(''),
      'vector-effect': 'non-scaling-stroke',
    }),
  );
  return svg;
}

/**
 * Ties a floating block to the axes: its footprint on the floor, dashed drop lines to it, and an age marker.
 * The age marker traces the exact start and end heights level to the time axis and is revealed on hover,
 * keyboard focus, or selection, so readers never have to judge height across the perspective by eye.
 * @param block - Plot layout for one dataset, including its precomputed reference lines.
 * @returns A decorative SVG sharing the block's coordinate space, painted beneath every block.
 */
export function createBlockShadow({ floor, drops, leaders, bracket, geometry: { bounds } }: PlotLayout) {
  const svg = createSvgElement('svg', {
    class: 'mhu-cube__shadow',
    viewBox: `${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`,
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
  });
  svg.append(
    createSvgElement('polygon', {
      class: 'mhu-cube__shadow-floor',
      points: floor.map((point) => `${point.x},${point.y}`).join(' '),
      'vector-effect': 'non-scaling-stroke',
    }),
  );
  if (drops.length > 0) {
    svg.append(
      createSvgElement('path', {
        class: 'mhu-cube__shadow-drop',
        d: toPathData(drops),
        'vector-effect': 'non-scaling-stroke',
      }),
    );
  }

  const marker = createSvgElement('g', { class: 'mhu-cube__time-marker' });
  marker.append(
    createSvgElement('path', {
      class: 'mhu-cube__time-leader',
      d: toPathData(leaders),
      'vector-effect': 'non-scaling-stroke',
    }),
    createSvgElement('path', {
      class: 'mhu-cube__time-bracket',
      d: toPathData([bracket]),
      'vector-effect': 'non-scaling-stroke',
    }),
  );
  svg.append(marker);
  return svg;
}

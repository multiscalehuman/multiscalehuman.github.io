import { svg, type Child } from '../dom/create-element';
import { toPathData, toPointList } from '../dom/svg-path';
import type { PlotLayout, ProjectedBoxGeometry } from '../geometry/types';

/** Keeps block outlines one pixel wide however far the block's SVG is stretched. */
const NON_SCALING_STROKE = { 'vector-effect': 'non-scaling-stroke' } as const;

/**
 * Creates the root of a block-sized decorative SVG, whose coordinates are plot percentages.
 * @param className - Class for the SVG.
 * @param bounds - The block's percentage bounds, used as the view box.
 * @param children - Shapes to draw, with falsy entries skipped.
 * @returns An SVG that stretches to fill its block.
 */
function createBlockSvg(
  className: string,
  bounds: ProjectedBoxGeometry['bounds'],
  children: readonly Child[],
): SVGSVGElement {
  return svg(
    'svg',
    {
      class: className,
      viewBox: `${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`,
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
    },
    children,
  );
}

/**
 * Draws a block's three visible faces from its projected corners; tall blocks become rectangular prisms.
 * @param geometry - Projected corners and percentage bounds from the plot layout.
 * @returns The decorative block SVG.
 */
export function createProjectedCube({ corners, bounds }: ProjectedBoxGeometry): SVGSVGElement {
  const { topFront, topLeft, topBack, topRight, bottomFront, bottomLeft, bottomRight } = corners;
  return createBlockSvg('mhu-cube__cube', bounds, [
    svg('polygon', {
      class: 'mhu-cube__top',
      points: toPointList([topFront, topLeft, topBack, topRight]),
      ...NON_SCALING_STROKE,
    }),
    svg('polygon', {
      class: 'mhu-cube__left',
      points: toPointList([topFront, topLeft, bottomLeft, bottomFront]),
      ...NON_SCALING_STROKE,
    }),
    svg('polygon', {
      class: 'mhu-cube__right',
      points: toPointList([topFront, topRight, bottomRight, bottomFront]),
      ...NON_SCALING_STROKE,
    }),
    svg('path', {
      class: 'mhu-cube__edge',
      d: toPathData([
        [topFront, topBack],
        [topLeft, topRight],
        [topFront, bottomLeft],
        [topLeft, bottomFront],
        [topFront, bottomRight],
        [topRight, bottomFront],
      ]),
      ...NON_SCALING_STROKE,
    }),
  ]);
}

/**
 * Ties a floating block to the axes: its footprint on the floor, dashed drop lines to it, and an age marker.
 * The age marker traces the exact start and end heights level to the time axis and is revealed on hover,
 * keyboard focus, or selection, so readers never have to judge height across the perspective by eye.
 * @param block - Plot layout for one dataset, including its precomputed reference lines.
 * @returns A decorative SVG sharing the block's coordinate space, painted beneath every block.
 */
export function createBlockShadow({ floor, drops, leaders, bracket, geometry: { bounds } }: PlotLayout): SVGSVGElement {
  return createBlockSvg('mhu-cube__shadow', bounds, [
    svg('polygon', { class: 'mhu-cube__shadow-floor', points: toPointList(floor), ...NON_SCALING_STROKE }),
    drops.length > 0 && svg('path', { class: 'mhu-cube__shadow-drop', d: toPathData(drops), ...NON_SCALING_STROKE }),
    svg('g', { class: 'mhu-cube__time-marker' }, [
      svg('path', { class: 'mhu-cube__time-leader', d: toPathData(leaders), ...NON_SCALING_STROKE }),
      svg('path', { class: 'mhu-cube__time-bracket', d: toPathData([bracket]), ...NON_SCALING_STROKE }),
    ]),
  ]);
}

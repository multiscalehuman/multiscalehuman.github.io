import { svg } from '../dom/create-element';
import { toPathData } from '../dom/svg-path';
import { getAxisLayout, getFrameEdges, getTimeCoordinate, getTimeGuide, projectPoint } from '../geometry/projection';
import type { MhuCubeAxes } from '../types';

/**
 * Creates the bounding cube with time guides on its far walls and floor guides through every category.
 * @param axes - Validated axes supplying the time ticks and category positions.
 * @returns A decorative SVG element with crisp, non-scaling frame lines.
 */
export function createCoordinateFrame(axes: MhuCubeAxes): SVGSVGElement {
  const layout = getAxisLayout(axes);
  const timeGuides = (axes.time.ticks ?? [])
    .filter((tick) => tick > axes.time.min && tick < axes.time.max)
    .map((tick) => getTimeGuide(getTimeCoordinate(tick, axes.time)));
  // Each floor guide runs from a category label across the floor, so a block's footprint sits on its two guides.
  const floorGuides = [
    ...layout.space.map((x) => [projectPoint(x, 0, 0), projectPoint(x, 0, 1)]),
    ...layout.organ.map((z) => [projectPoint(0, 0, z), projectPoint(1, 0, z)]),
  ];
  return svg(
    'svg',
    { class: 'mhu-cube__frame', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
    [
      svg('path', { class: 'mhu-cube__frame-guide', d: toPathData(timeGuides) }),
      svg('path', { class: 'mhu-cube__frame-floor-guide', d: toPathData(floorGuides) }),
      svg('path', { class: 'mhu-cube__frame-line', d: toPathData(getFrameEdges()) }),
    ],
  );
}

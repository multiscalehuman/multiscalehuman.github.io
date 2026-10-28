import { getAxisEdges, getAxisLayout, getTimeCoordinate } from '../geometry/projection';
import type { AxisEdge, Point } from '../geometry/types';
import { NUMBER_FORMAT } from '../text/format';
import type { MhuCubeAxes } from '../types';

// Normal components below this keep a label centered on that axis instead of aligned to one side.
const LABEL_ALIGN_THRESHOLD = 0.15;

/**
 * Picks the label box edge that touches its axis point so the box extends away from the frame.
 * @param component - One component of the edge's outward unit normal.
 * @returns A CSS translate percentage for that axis.
 */
function getLabelAlignment(component: number): string {
  return component > LABEL_ALIGN_THRESHOLD ? '0%' : component < -LABEL_ALIGN_THRESHOLD ? '-100%' : '-50%';
}

/**
 * Creates visual labels for the time, space, and organ axes, placed from the frame's own edges.
 * @param axes - Validated axes; organ values arrive alphabetized.
 * @returns A decorative label layer positioned over the coordinate frame.
 */
export function createAxisLabels(axes: MhuCubeAxes): HTMLDivElement {
  const labels = document.createElement('div');
  labels.className = 'mhu-cube__axes';
  labels.setAttribute('aria-hidden', 'true');
  // Each label sits exactly on its axis position; CSS pushes it outward along the edge's normal.
  const addLabel = (text: string, className: string, point: Point, normal: Point): HTMLSpanElement => {
    const label = document.createElement('span');
    label.className = className;
    label.textContent = text;
    label.style.left = `${point.x}%`;
    label.style.top = `${point.y}%`;
    label.style.setProperty('--axis-normal-x', normal.x.toFixed(4));
    label.style.setProperty('--axis-normal-y', normal.y.toFixed(4));
    labels.append(label);
    return label;
  };
  const along = (edge: AxisEdge, t: number): Point => ({
    x: edge.start.x + (edge.end.x - edge.start.x) * t,
    y: edge.start.y + (edge.end.y - edge.start.y) * t,
  });
  const addValue = (text: string, axis: keyof MhuCubeAxes, point: Point, normal: Point): void => {
    const label = addLabel(text, `mhu-cube__axis-value mhu-cube__axis-value--${axis}`, point, normal);
    label.style.setProperty('--_align-x', getLabelAlignment(normal.x));
    label.style.setProperty('--_align-y', getLabelAlignment(normal.y));
  };
  // Floor titles sit centered in a second row. A sloped edge makes value labels reach farther from it, so the
  // offset clears labels up to about 4rem wide and 1rem tall, plus the title's own half size, along the normal.
  const addFloorTitle = (text: string, axis: 'space' | 'organ', edge: AxisEdge): void => {
    const label = addLabel(text, `mhu-cube__axis-title mhu-cube__axis-title--${axis}`, along(edge, 0.5), edge.normal);
    label.style.setProperty(
      '--_offset',
      `${(0.75 + 1.6 * Math.abs(edge.normal.y) + 5.5 * Math.abs(edge.normal.x)).toFixed(3)}rem`,
    );
  };

  const edges = getAxisEdges();
  const layout = getAxisLayout(axes);
  const timeTitle = axes.time.unit ? `${axes.time.label} (${axes.time.unit})` : axes.time.label;
  addLabel(timeTitle, 'mhu-cube__axis-title mhu-cube__axis-title--time', edges.time.end, edges.time.normal);
  addFloorTitle(axes.space.label, 'space', edges.space);
  addFloorTitle(axes.organ.label, 'organ', edges.organ);
  (axes.time.ticks ?? []).forEach((tick) => {
    addValue(
      NUMBER_FORMAT.format(tick),
      'time',
      along(edges.time, getTimeCoordinate(tick, axes.time)),
      edges.time.normal,
    );
  });
  // Space and organ labels start exactly where their floor guides meet the frame.
  axes.space.values.forEach((value, index) =>
    addValue(value, 'space', along(edges.space, layout.space[index]), edges.space.normal),
  );
  axes.organ.values.forEach((value, index) =>
    addValue(value, 'organ', along(edges.organ, layout.organ[index]), edges.organ.normal),
  );
  return labels;
}

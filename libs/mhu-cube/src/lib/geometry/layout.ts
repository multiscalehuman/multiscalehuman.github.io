import type { MhuCubeAxes, MhuCubeItem } from '../types';
import { getNearCorners, getProjectedBoxGeometry, getRenderedTimeExtent } from './box';
import { assignLanes, compareText, getDepth, getLaneExtent, type Placement } from './lanes';
import { getAxisLayout, getTimeCoordinate, projectPoint } from './projection';
import type { Box, PlotLayout, Point } from './types';
import { VIEW } from './view';

// Hover cards stay within this vertical band of the plot.
const CARD_ANCHOR_MIN = 12;
const CARD_ANCHOR_MAX = 88;

/**
 * Builds the reference lines that tie one block to the floor and to the time axis.
 * @param box - Normalized block extents.
 * @param time - The dataset's exact normalized time span.
 * @returns Footprint, drop lines, level lines, and time-axis bracket in plot percentages.
 */
function getBlockGuides(box: Box, time: { start: number; end: number }) {
  const { front, left, right, back } = getNearCorners(box);
  const floor = [front, left, back, right].map(([x, z]) => projectPoint(x, 0, z));
  // The three visible bottom corners drop to the floor, outlining where the block would rest.
  const drops =
    box.y0 > 0
      ? [front, left, right].map(([x, z]): [Point, Point] => [projectPoint(x, box.y0, z), projectPoint(x, 0, z)])
      : [];
  // Each level line stays at one height: from the block's corner nearest the time ticks, across to the tick
  // edge's wall, then along that wall to the ticks.
  const [tickX, tickZ] = VIEW.ticks;
  const cornerX = tickX === 1 ? box.x1 : box.x0;
  const cornerZ = tickZ === 1 ? box.z1 : box.z0;
  const levels = time.start === time.end ? [time.start] : [time.start, time.end];
  const leaders = levels.map((y) => [
    projectPoint(cornerX, y, cornerZ),
    projectPoint(tickX, y, cornerZ),
    projectPoint(tickX, y, tickZ),
  ]);
  const bracket: [Point, Point] = [projectPoint(tickX, time.start, tickZ), projectPoint(tickX, time.end, tickZ)];
  return { floor, drops, leaders, bracket };
}

/**
 * Computes every plotted block's geometry, lane, paint order, reference lines, and hover-card anchor.
 * @param items - Validated datasets; those without a position are skipped.
 * @param axes - Validated, plottable axes.
 * @returns Layout keyed by dataset ID.
 */
export function layoutPlot(items: readonly MhuCubeItem[], axes: MhuCubeAxes) {
  const axisLayout = getAxisLayout(axes);
  const { halfSize } = axisLayout;
  const { near } = VIEW;
  const placements: Placement[] = [];
  items.forEach((item) => {
    if (!item.position) {
      return;
    }
    const spaceIndex = axes.space.values.indexOf(item.position.space);
    const organIndex = axes.organ.values.indexOf(item.position.organ);
    if (spaceIndex < 0 || organIndex < 0) {
      return;
    }
    placements.push({
      id: item.id,
      spaceIndex,
      organIndex,
      time: {
        start: getTimeCoordinate(item.position.time.start, axes.time),
        end: getTimeCoordinate(item.position.time.end, axes.time),
      },
      ...getRenderedTimeExtent(item.position.time, axes.time, halfSize * 2),
    });
  });

  const slots = assignLanes(placements);
  const blocks = placements.map((placement) => {
    const centerX = axisLayout.space[placement.spaceIndex];
    const centerZ = axisLayout.organ[placement.organIndex];
    const slot = slots.get(placement.id) ?? { lane: 0, laneCount: 1 };
    const [x0, x1] = [centerX - halfSize, centerX + halfSize];
    const [z0, z1] = getLaneExtent(
      centerZ,
      halfSize,
      axisLayout.organBands[placement.organIndex],
      slot,
      near[1] === 0 ? 1 : 0,
    );
    const box: Box = { x0, x1, y0: placement.y0, y1: placement.y1, z0, z1 };
    return {
      id: placement.id,
      box,
      time: placement.time,
      cellDepth: getDepth(centerX, centerZ),
      laneDepth: getDepth((x0 + x1) / 2, (z0 + z1) / 2),
    };
  });

  // Paint farther cells, then farther lanes, then lower blocks first so nearer faces and upper blocks stay visible.
  blocks.sort(
    (a, b) => b.cellDepth - a.cellDepth || b.laneDepth - a.laneDepth || a.box.y0 - b.box.y0 || compareText(a.id, b.id),
  );

  const layout = new Map<string, PlotLayout>();
  blocks.forEach(({ id, box, time }, rank) => {
    const geometry = getProjectedBoxGeometry(box);
    const { bounds } = geometry;
    const topCenter = projectPoint((box.x0 + box.x1) / 2, box.y1, (box.z0 + box.z1) / 2);
    const anchor = Math.min(Math.max(topCenter.y, CARD_ANCHOR_MIN), CARD_ANCHOR_MAX);
    layout.set(id, {
      box,
      time,
      geometry,
      ...getBlockGuides(box, time),
      layer: rank + 1,
      cardSide: bounds.left + bounds.width / 2 > 66 ? 'left' : 'right',
      cardTop: ((anchor - bounds.top) / bounds.height) * 100,
    });
  });
  return layout;
}

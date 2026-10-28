import type { MhuCubeAxes, MhuCubeItem } from '../types';
import { VIEW } from './view';

// Share of a band that lane groups may fill.
const LANE_BAND_FILL = 0.9;
// Normalized space between side-by-side lanes.
const LANE_GAP = 0.02;
// Rendered time extents closer than this share a cluster so stacked blocks never visually touch.
const OVERLAP_TOLERANCE = 0.02;

/**
 * Orders text by UTF-16 code units, giving a locale-independent tie-breaker for stable sorting.
 * @param a - First text.
 * @param b - Second text.
 * @returns A negative, zero, or positive sort result.
 */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Orders datasets so reading and keyboard order follow the plot: organ, space, time, then ID.
 * @param items - Validated datasets.
 * @param axes - Validated axes whose value order defines organ and space order.
 * @returns A new array with positioned datasets first and unpositioned datasets in their original order.
 */
export function sortItemsForDisplay(items: readonly MhuCubeItem[], axes: MhuCubeAxes): MhuCubeItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const first = a.item.position;
      const second = b.item.position;
      if (!first || !second) {
        return first ? -1 : second ? 1 : a.index - b.index;
      }
      return (
        axes.organ.values.indexOf(first.organ) - axes.organ.values.indexOf(second.organ) ||
        axes.space.values.indexOf(first.space) - axes.space.values.indexOf(second.space) ||
        first.time.start - second.time.start ||
        first.time.end - second.time.end ||
        compareText(a.item.id, b.item.id)
      );
    })
    .map(({ item }) => item);
}

/** A plotted dataset's floor cell and its exact and drawn normalized time extents. */
export interface Placement {
  id: string;
  spaceIndex: number;
  organIndex: number;
  time: { start: number; end: number };
  y0: number;
  y1: number;
}

/** A block's lane within its overlap cluster. */
export interface LaneSlot {
  /** Zero is the farthest lane from the viewer. */
  lane: number;
  laneCount: number;
}

/**
 * Splits one cluster of overlapping blocks into lanes, placing taller lanes farther back.
 * @param cluster - Blocks sorted by start whose drawn extents overlap transitively.
 * @param slots - Lane assignments, updated in place.
 * @returns Nothing.
 */
function assignClusterLanes(cluster: Placement[], slots: Map<string, LaneSlot>): void {
  const lanes: { end: number; tallest: number; members: Placement[] }[] = [];
  cluster.forEach((placement) => {
    let lane = lanes.find((candidate) => placement.y0 >= candidate.end + OVERLAP_TOLERANCE);
    if (!lane) {
      lane = { end: -Infinity, tallest: 0, members: [] };
      lanes.push(lane);
    }
    lane.end = placement.y1;
    lane.tallest = Math.max(lane.tallest, placement.y1 - placement.y0);
    lane.members.push(placement);
  });
  // A tall block in front would hide most of a shorter neighbor, so taller lanes sit behind.
  lanes
    .map((lane, index) => ({ lane, index }))
    .sort((a, b) => b.lane.tallest - a.lane.tallest || a.index - b.index)
    .forEach(({ lane }, depth) => {
      lane.members.forEach((member) => slots.set(member.id, { lane: depth, laneCount: lanes.length }));
    });
}

/**
 * Assigns lanes per overlap cluster within each space and organ cell.
 * @param placements - Blocks with their drawn time extents.
 * @returns Lane assignments; blocks that overlap nothing keep a single full-width lane.
 */
export function assignLanes(placements: Placement[]): Map<string, LaneSlot> {
  const slots = new Map<string, LaneSlot>();
  const cells = new Map<string, Placement[]>();
  placements.forEach((placement) => {
    const key = `${placement.spaceIndex}:${placement.organIndex}`;
    cells.set(key, [...(cells.get(key) ?? []), placement]);
  });
  cells.forEach((cell) => {
    cell.sort((a, b) => a.y0 - b.y0 || a.y1 - b.y1 || compareText(a.id, b.id));
    let cluster: Placement[] = [];
    let clusterEnd = -Infinity;
    cell.forEach((placement) => {
      if (cluster.length > 0 && placement.y0 >= clusterEnd + OVERLAP_TOLERANCE) {
        assignClusterLanes(cluster, slots);
        cluster = [];
      }
      clusterEnd = cluster.length === 0 ? placement.y1 : Math.max(clusterEnd, placement.y1);
      cluster.push(placement);
    });
    if (cluster.length > 0) {
      assignClusterLanes(cluster, slots);
    }
  });
  return slots;
}

/**
 * Finds a block's extent along the organ axis, where overlapping blocks form lanes, narrowing it only when it shares a cluster.
 * @param center - Normalized center of the block's category on the lane axis.
 * @param halfSize - Half of a full-width footprint.
 * @param band - Normalized range the category's lanes may occupy.
 * @param slot - The block's lane assignment.
 * @param farEnd - Which end of the organ axis is farther from the camera; lane zero sits there.
 * @returns Normalized start and end along the organ axis.
 */
export function getLaneExtent(
  center: number,
  halfSize: number,
  band: [number, number],
  slot: LaneSlot,
  farEnd: 0 | 1,
): [number, number] {
  if (slot.laneCount === 1) {
    return [center - halfSize, center + halfSize];
  }
  // Lanes may spread a little into the band's spare width so each stays a usable target, but never past it.
  const room = 2 * Math.min(center - band[0], band[1] - center) * LANE_BAND_FILL;
  const span = Math.min(2 * halfSize * (1 + 0.5 * (slot.laneCount - 1)), room);
  const width = (span - LANE_GAP * (slot.laneCount - 1)) / slot.laneCount;
  const offset = span / 2 - slot.lane * (width + LANE_GAP);
  return farEnd === 1 ? [center + offset - width, center + offset] : [center - offset, center - offset + width];
}

/**
 * Measures how far a floor position is from the camera's nearest corner.
 * @param x - Normalized space position.
 * @param z - Normalized organ position.
 * @returns A depth that grows away from the camera.
 */
export function getDepth(x: number, z: number): number {
  const [nearX, nearZ] = VIEW.near;
  return Math.abs(x - nearX) + Math.abs(z - nearZ);
}

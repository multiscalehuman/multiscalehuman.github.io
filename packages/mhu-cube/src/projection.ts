import type { MhuCubeAxes, MhuCubeItem, MhuCubeTimeAxis, MhuCubeTimeRange } from "./types";

export interface Point {
  x: number;
  y: number;
}

/** Normalized block extents where x is space (inverted), y is time, and z is organ. */
export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

/**
 * Projected block corners: `front` is the corner nearest the camera, `left` sits across the space axis from it,
 * and `right` across the organ axis. The faces meeting at `front` are visible.
 */
export interface ProjectedBoxGeometry {
  corners: {
    topFront: Point;
    topLeft: Point;
    topBack: Point;
    topRight: Point;
    bottomFront: Point;
    bottomLeft: Point;
    bottomRight: Point;
  };
  bounds: { left: number; top: number; width: number; height: number };
}

/** Placement, paint order, reference lines, and hover-card anchoring for one plotted dataset. */
export interface PlotLayout {
  box: Box;
  /** The dataset's exact normalized time span, which single ages and short ranges draw larger than. */
  time: { start: number; end: number };
  geometry: ProjectedBoxGeometry;
  /** The block's footprint on the floor. */
  floor: Point[];
  /** Lines from the block's visible bottom corners down to the floor; empty when it rests on the floor. */
  drops: Array<[Point, Point]>;
  /** Level lines tracing the exact start and end heights from the block to the time axis. */
  leaders: Point[][];
  /** The exact time span marked on the time axis. */
  bracket: [Point, Point];
  /** Paint order starting at one; higher values render in front. */
  layer: number;
  /** Side of the block where its hover card opens. */
  cardSide: "left" | "right";
  /** Vertical hover-card anchor as a percentage of the block's bounds. */
  cardTop: number;
}

/** A floor corner as [x, z], each zero or one. */
type FloorCorner = [0 | 1, 0 | 1];

/** A horizontal face of the bounding cube in plot percentages, keyed by floor corner. */
interface FramePlane {
  x0z0: Point;
  x1z0: Point;
  x1z1: Point;
  x0z1: Point;
}

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
function fitFrame(planes: ViewDefinition["planes"]): Pick<ViewDefinition, "planes" | "heightRatio"> {
  const points = [...Object.values(planes.top), ...Object.values(planes.bottom)];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const width = Math.max(...xs) - left;
  const height = Math.max(...ys) - top;
  const fit = (point: Point) => ({ x: ((point.x - left) / width) * 100, y: ((point.y - top) / height) * 100 });
  const fitPlane = (plane: FramePlane): FramePlane => ({
    x0z0: fit(plane.x0z0),
    x1z0: fit(plane.x1z0),
    x1z1: fit(plane.x1z1),
    x0z1: fit(plane.x0z1),
  });
  return { planes: { top: fitPlane(planes.top), bottom: fitPlane(planes.bottom) }, heightRatio: (height * DESIGN_HEIGHT_RATIO) / width };
}

// Faces the organ axis from above and slightly right of it: organs run left to right along the front, time runs
// straight up, and space recedes mostly upward. The small sideways shift keeps each organ's rows in its own
// column; front-row heights read against the ticks and back-row heights against the back-wall time lines.
// Overlapping datasets sit side by side within their organ.
const VIEW: ViewDefinition = {
  ...fitFrame({
    top: { x0z0: { x: 16, y: 18 }, x1z0: { x: 20, y: 10 }, x1z1: { x: 82, y: 10 }, x0z1: { x: 78, y: 18 } },
    bottom: { x0z0: { x: 16, y: 86 }, x1z0: { x: 20, y: 78 }, x1z1: { x: 82, y: 78 }, x0z1: { x: 78, y: 86 } },
  }),
  near: [0, 1],
  ticks: [0, 0],
};

/** The drawing area's height as a share of its width; the element passes it to CSS so the plot keeps the frame's proportions. */
export const DRAWING_AREA_RATIO = VIEW.heightRatio;

/** Where each category sits on the floor and how much room its blocks have. */
export interface AxisLayout {
  /** Half of a full-width block's normalized footprint. */
  halfSize: number;
  /** Normalized x center for each space value, in axis order. */
  space: number[];
  /** Normalized z center for each organ value, in axis order. */
  organ: number[];
  /** Normalized z range each organ value's lanes may occupy, in axis order. */
  organBands: Array<[number, number]>;
}

// Share of a categorical cell covered by a block's footprint.
const FOOTPRINT_FILL = 0.7;
// Gap kept between the outermost space blocks and the frame.
const SPACE_EDGE_MARGIN = 0.07;
// Share of a band that lane groups may fill.
const LANE_BAND_FILL = 0.9;
// Normalized space between side-by-side lanes.
const LANE_GAP = 0.02;
// Rendered time extents closer than this share a cluster so stacked blocks never visually touch.
const OVERLAP_TOLERANCE = 0.02;
// Hover cards stay within this vertical band of the plot.
const CARD_ANCHOR_MIN = 12;
const CARD_ANCHOR_MAX = 88;
// Every edge of the unit cube as pairs of [x, y, z] corners.
const CUBE_EDGES: Array<[[number, number, number], [number, number, number]]> = [
  [[0, 0, 0], [1, 0, 0]], [[0, 0, 1], [1, 0, 1]], [[0, 1, 0], [1, 1, 0]], [[0, 1, 1], [1, 1, 1]],
  [[0, 0, 0], [0, 0, 1]], [[1, 0, 0], [1, 0, 1]], [[0, 1, 0], [0, 1, 1]], [[1, 1, 0], [1, 1, 1]],
  [[0, 0, 0], [0, 1, 0]], [[1, 0, 0], [1, 1, 0]], [[0, 0, 1], [0, 1, 1]], [[1, 0, 1], [1, 1, 1]],
];

/**
 * Places a categorical index at the center of its equal-width axis cell.
 * @param value - Zero-based category index.
 * @param count - Total categories on the axis.
 * @returns A normalized position between zero and one.
 */
export function getCategoryCenter(value: number, count: number) {
  return count > 0 ? (value + 0.5) / count : 0.5;
}

/**
 * Spreads a few categories toward the ends of an axis so their blocks read as distinct groups.
 * @param value - Zero-based category index.
 * @param count - Total categories on the axis.
 * @param halfSize - Half of a block's footprint, used to keep blocks inside the frame.
 * @returns A normalized position between zero and one; never closer together than equal-width cells.
 */
export function getSpreadCenter(value: number, count: number, halfSize: number) {
  if (count <= 1) return 0.5;
  const inset = Math.min(0.5 / count, halfSize + SPACE_EDGE_MARGIN);
  return inset + (value * (1 - 2 * inset)) / (count - 1);
}

function interpolatePlane(plane: FramePlane, x: number, z: number): Point {
  const weights = {
    x0z0: (1 - x) * (1 - z),
    x1z0: x * (1 - z),
    x1z1: x * z,
    x0z1: (1 - x) * z,
  };
  return {
    x: plane.x0z0.x * weights.x0z0 + plane.x1z0.x * weights.x1z0 + plane.x1z1.x * weights.x1z1 + plane.x0z1.x * weights.x0z1,
    y: plane.x0z0.y * weights.x0z0 + plane.x1z0.y * weights.x1z0 + plane.x1z1.y * weights.x1z1 + plane.x0z1.y * weights.x0z1,
  };
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
export function getTimeCoordinate(value: number, axis: MhuCubeTimeAxis) {
  return (value - axis.min) / (axis.max - axis.min);
}

/**
 * Sizes block footprints from the denser categorical axis.
 * @param spaceCount - Number of space categories.
 * @param organCount - Number of organ categories.
 * @returns Half of a full-width block's normalized footprint.
 */
export function getFootprintHalfSize(spaceCount: number, organCount: number) {
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
export function getFrameEdges(): Array<[Point, Point]> {
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
export function getAxisEdges() {
  const { near, ticks } = VIEW;
  const edge = (start: [number, number, number], end: [number, number, number]) => {
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
  if (end - start >= minHeight) return { y0: start, y1: end };
  const height = Math.min(minHeight, 1);
  const y0 = Math.min(Math.max((start + end) / 2 - height / 2, 0), 1 - height);
  return { y0, y1: y0 + height };
}

/**
 * Finds a block's floor corners relative to the camera.
 * @param box - Normalized block extents.
 * @returns The nearest corner, the corner across the space axis, the corner across the organ axis, and the far corner.
 */
function getNearCorners(box: Box) {
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

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Orders datasets so reading and keyboard order follow the plot: organ, space, time, then ID.
 * @param items - Validated datasets.
 * @param axes - Validated axes whose value order defines organ and space order.
 * @returns A new array with positioned datasets first and unpositioned datasets in their original order.
 */
export function sortItemsForDisplay(items: readonly MhuCubeItem[], axes: MhuCubeAxes) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const first = a.item.position;
      const second = b.item.position;
      if (!first || !second) return first ? -1 : second ? 1 : a.index - b.index;
      return axes.organ.values.indexOf(first.organ) - axes.organ.values.indexOf(second.organ)
        || axes.space.values.indexOf(first.space) - axes.space.values.indexOf(second.space)
        || first.time.start - second.time.start
        || first.time.end - second.time.end
        || compareText(a.item.id, b.item.id);
    })
    .map(({ item }) => item);
}

interface Placement {
  id: string;
  spaceIndex: number;
  organIndex: number;
  time: { start: number; end: number };
  y0: number;
  y1: number;
}

interface LaneSlot {
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
function assignClusterLanes(cluster: Placement[], slots: Map<string, LaneSlot>) {
  const lanes: Array<{ end: number; tallest: number; members: Placement[] }> = [];
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
function assignLanes(placements: Placement[]) {
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
    if (cluster.length > 0) assignClusterLanes(cluster, slots);
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
function getLaneExtent(center: number, halfSize: number, band: [number, number], slot: LaneSlot, farEnd: 0 | 1): [number, number] {
  if (slot.laneCount === 1) return [center - halfSize, center + halfSize];
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
function getDepth(x: number, z: number) {
  const [nearX, nearZ] = VIEW.near;
  return Math.abs(x - nearX) + Math.abs(z - nearZ);
}

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
  const drops = box.y0 > 0
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
    if (!item.position) return;
    const spaceIndex = axes.space.values.indexOf(item.position.space);
    const organIndex = axes.organ.values.indexOf(item.position.organ);
    if (spaceIndex < 0 || organIndex < 0) return;
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
    const [z0, z1] = getLaneExtent(centerZ, halfSize, axisLayout.organBands[placement.organIndex], slot, near[1] === 0 ? 1 : 0);
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
  blocks.sort((a, b) => b.cellDepth - a.cellDepth
    || b.laneDepth - a.laneDepth
    || a.box.y0 - b.box.y0
    || compareText(a.id, b.id));

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
      cardSide: bounds.left + bounds.width / 2 > 66 ? "left" : "right",
      cardTop: ((anchor - bounds.top) / bounds.height) * 100,
    });
  });
  return layout;
}

import assert from "node:assert/strict";
import test from "node:test";

import {
  DRAWING_AREA_RATIO,
  getAxisEdges,
  getAxisLayout,
  getCategoryCenter,
  getFootprintHalfSize,
  getFrameEdges,
  getProjectedBoxGeometry,
  getRenderedTimeExtent,
  getSpreadCenter,
  getTimeCoordinate,
  getTimeGuide,
  layoutPlot,
  projectPoint,
  sortItemsForDisplay,
} from "../packages/mhu-cube/src/projection.ts";

const time = { label: "Time", unit: "years", min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] };
const axes = {
  time,
  space: { label: "Space", values: ["100 µm", "100 mm"] },
  organ: { label: "Organ", values: ["Heart", "Kidney", "Liver", "Thymus"] },
};

function dataset(id, start, end, space, organ) {
  return { id, label: id, href: `#${id}`, status: "available", position: { time: { start, end }, space, organ } };
}

// Overlapping datasets split into lanes along the organ axis, so a block's width is its z extent.
const width = (layout) => layout.box.z1 - layout.box.z0;
const fullWidth = getFootprintHalfSize(2, 4) * 2;

test("getCategoryCenter centers indexes within equal categorical cells", () => {
  assert.equal(getCategoryCenter(0, 2), 0.25);
  assert.equal(getCategoryCenter(1, 2), 0.75);
});

test("getSpreadCenter separates two space values well beyond equal-width cells", () => {
  const halfSize = getFootprintHalfSize(2, 4);
  const first = getSpreadCenter(0, 2, halfSize);
  const second = getSpreadCenter(1, 2, halfSize);

  assert.ok(second - first > getCategoryCenter(1, 2) - getCategoryCenter(0, 2));
  assert.ok(Math.abs(first + second - 1) < 1e-9, "Spread values stay symmetric.");
  assert.ok(first - halfSize > 0 && second + halfSize < 1, "Blocks stay inside the frame.");
  assert.equal(getSpreadCenter(0, 1, halfSize), 0.5);
});

test("getSpreadCenter never packs many values tighter than equal-width cells", () => {
  const halfSize = getFootprintHalfSize(8, 4);

  for (let index = 0; index < 8; index += 1) {
    assert.ok(Math.abs(getSpreadCenter(index, 8, halfSize) - getCategoryCenter(index, 8)) < 1e-9);
  }
});

test("getAxisLayout places the first space value in the back row and gives each organ its own lane band", () => {
  const layout = getAxisLayout(axes);

  assert.ok(layout.space[0] > layout.space[1], "The first space value sits toward x = 1, the back row.");
  assert.deepEqual(layout.organ, [0.125, 0.375, 0.625, 0.875]);
  assert.deepEqual(layout.organBands, [[0, 0.25], [0.25, 0.5], [0.5, 0.75], [0.75, 1]]);
});

test("getFrameEdges projects all twelve edges of the bounding cube", () => {
  const edges = getFrameEdges();
  const frontEdge = edges.find(([start, end]) => start.x === projectPoint(0, 0, 0).x && start.y === projectPoint(0, 0, 0).y
    && end.x === projectPoint(0, 1, 0).x && end.y === projectPoint(0, 1, 0).y);

  assert.equal(edges.length, 12);
  assert.ok(frontEdge, "The front vertical edge is part of the frame.");
});

test("the low camera keeps floor depth well short of the time axis height on screen", () => {
  const timeHeight = projectPoint(0, 0, 0).y - projectPoint(0, 1, 0).y;
  const floorDepth = projectPoint(0, 0, 0).y - projectPoint(1, 0, 1).y;

  assert.ok(floorDepth < timeHeight * 0.4, "Depth must move blocks up the screen far less than time does.");
});

test("the frame touches all four sides of a drawing area shaped like it", () => {
  const corners = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => projectPoint(x, y, z))));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  [Math.min(...xs), Math.min(...ys)].forEach((value) => assert.ok(Math.abs(value) < 1e-9, "The frame reaches the left and top."));
  [Math.max(...xs), Math.max(...ys)].forEach((value) => assert.ok(Math.abs(value - 100) < 1e-9, "The frame reaches the right and bottom."));
  // The camera faces the organs head-on, so the drawing area is almost square.
  assert.ok(Math.abs(DRAWING_AREA_RATIO - 1) < 0.001);
});

test("getAxisEdges points every label direction away from the cube", () => {
  const { time, space, organ } = getAxisEdges();
  [time, space, organ].forEach(({ normal }) => assert.ok(Math.abs(Math.hypot(normal.x, normal.y) - 1) < 1e-9));

  assert.ok(time.normal.x < -0.9, "Time ticks sit to the left of the left edge.");
  assert.ok(space.normal.x > 0, "Space labels sit to the right of the right floor edge.");
  assert.deepEqual(time.end, projectPoint(0, 1, 0));
});

test("the camera faces the organ axis with a level front edge and labels hanging straight below it", () => {
  const { organ, time } = getAxisEdges();

  assert.equal(projectPoint(0, 0, 0).y, projectPoint(0, 0, 1).y);
  assert.ok(Math.abs(organ.normal.x) < 1e-9 && organ.normal.y > 0.99, "Organ labels hang straight below the front edge.");
  const frameX = getFrameEdges().flat().map((point) => point.x);
  assert.equal(time.start.x, Math.min(...frameX), "Time ticks run up the leftmost edge.");
});

test("the camera keeps each organ's space rows in its own column", () => {
  const layout = getAxisLayout(axes);
  const rowShift = Math.abs(projectPoint(layout.space[0], 0, 0.5).x - projectPoint(layout.space[1], 0, 0.5).x);
  const organSpacing = projectPoint(0, 0, layout.organ[1]).x - projectPoint(0, 0, layout.organ[0]).x;

  assert.ok(rowShift < organSpacing / 3, "The back row must not drift into the next organ's column.");
});

test("time guides and level lines start and end on the time tick edge", () => {
  const { time } = getAxisEdges();
  const tickAt = (y) => ({ x: time.start.x + (time.end.x - time.start.x) * y, y: time.start.y + (time.end.y - time.start.y) * y });
  const guide = getTimeGuide(0.4);
  assert.ok(Math.abs(guide[0].x - tickAt(0.4).x) < 1e-9 && Math.abs(guide[0].y - tickAt(0.4).y) < 1e-9, "The guide starts at the ticks");

  const block = layoutPlot([dataset("range", 20, 60, "100 µm", "Heart")], axes).get("range");
  block.leaders.forEach((leader, index) => {
    const end = leader.at(-1);
    const level = index === 0 ? 0.2 : 0.6;
    assert.ok(Math.abs(end.x - tickAt(level).x) < 1e-9 && Math.abs(end.y - tickAt(level).y) < 1e-9, "The level line ends at its tick");
  });
  assert.ok(Math.abs(block.bracket[1].y - tickAt(0.6).y) < 1e-9, "The bracket ends at the range's end");
});

test("layoutPlot splits overlapping datasets side by side within their organ", () => {
  const layout = layoutPlot([
    dataset("liver-45", 45, 45, "100 µm", "Liver"),
    dataset("liver-7-47", 7, 47, "100 µm", "Liver"),
  ], axes);
  const single = layout.get("liver-45").box;
  const range = layout.get("liver-7-47").box;
  const [bandStart, bandEnd] = getAxisLayout(axes).organBands[2];

  assert.equal(single.x0, range.x0, "Lanes share the space row.");
  assert.ok(single.z1 < range.z0 || range.z1 < single.z0, "Lanes sit side by side along the organ axis.");
  [single, range].forEach((box) => assert.ok(box.z0 >= bandStart && box.z1 <= bandEnd, "Lanes stay inside their organ."));
  assert.ok(range.z0 < single.z0, "The taller range takes the lane farther from the camera.");
});

test("layoutPlot paints the front row and right-hand neighbors over what sits behind them", () => {
  const layout = layoutPlot([
    dataset("back", 50, 50, "100 µm", "Heart"),
    dataset("front", 50, 50, "100 mm", "Heart"),
    dataset("right", 50, 50, "100 mm", "Kidney"),
  ], axes);

  assert.ok(layout.get("front").layer > layout.get("back").layer);
  assert.ok(layout.get("right").layer > layout.get("front").layer);
  assert.deepEqual(layout.get("front").geometry.corners.topFront, projectPoint(layout.get("front").box.x0, layout.get("front").box.y1, layout.get("front").box.z1));
});

test("blocks resting on the floor have no drop lines", () => {
  const layout = layoutPlot([dataset("infant", 4 / 12, 5 / 12, "100 µm", "Thymus"), dataset("raised", 60, 60, "100 µm", "Heart")], axes);

  assert.deepEqual(layout.get("infant").drops, []);
  assert.equal(layout.get("raised").drops.length, 3);
  assert.equal(layout.get("raised").floor.length, 4);
});

test("getTimeCoordinate maps the time domain onto the vertical axis", () => {
  assert.equal(getTimeCoordinate(0, time), 0);
  assert.equal(getTimeCoordinate(45, time), 0.45);
  assert.equal(getTimeCoordinate(100, time), 1);
});

test("getFootprintHalfSize sizes blocks from the denser categorical axis", () => {
  assert.equal(getFootprintHalfSize(2, 4), getFootprintHalfSize(4, 2));
  assert.ok(getFootprintHalfSize(2, 4) < getFootprintHalfSize(2, 2));
});

test("getRenderedTimeExtent keeps long ranges exact and grows short ranges to a cube", () => {
  assert.deepEqual(getRenderedTimeExtent({ start: 7, end: 47 }, time, 0.175), { y0: 0.07, y1: 0.47 });
  const single = getRenderedTimeExtent({ start: 45, end: 45 }, time, 0.175);
  assert.ok(Math.abs(single.y1 - single.y0 - 0.175) < 1e-9);
  assert.ok(Math.abs((single.y0 + single.y1) / 2 - 0.45) < 1e-9);
});

test("getRenderedTimeExtent shifts edge blocks inward instead of clipping them", () => {
  const infant = getRenderedTimeExtent({ start: 4 / 12, end: 5 / 12 }, time, 0.175);
  assert.equal(infant.y0, 0);
  assert.ok(Math.abs(infant.y1 - 0.175) < 1e-9);
  const oldest = getRenderedTimeExtent({ start: 100, end: 100 }, time, 0.175);
  assert.equal(oldest.y1, 1);
  assert.ok(Math.abs(oldest.y1 - oldest.y0 - 0.175) < 1e-9);
});

test("projectPoint returns finite perspective coordinates", () => {
  const point = projectPoint(0.5, 0.5, 0.5);

  assert.equal(Number.isFinite(point.x), true);
  assert.equal(Number.isFinite(point.y), true);
  assert.ok(point.x > 0 && point.x < 100);
  assert.ok(point.y > 0 && point.y < 100);
});

test("getProjectedBoxGeometry returns positive bounds around every corner", () => {
  const geometry = getProjectedBoxGeometry({ x0: 0.2, x1: 0.4, y0: 0.1, y1: 0.7, z0: 0.5, z1: 0.7 });
  const corners = Object.values(geometry.corners);

  assert.ok(geometry.bounds.width > 0);
  assert.ok(geometry.bounds.height > 0);
  assert.ok(corners.every((point) => point.x >= geometry.bounds.left));
  assert.ok(corners.every((point) => point.x <= geometry.bounds.left + geometry.bounds.width));
  assert.ok(corners.every((point) => point.y >= geometry.bounds.top));
  assert.ok(corners.every((point) => point.y <= geometry.bounds.top + geometry.bounds.height));
});

test("layoutPlot draws time ranges as taller blocks than single ages", () => {
  const layout = layoutPlot([
    dataset("single", 63, 63, "100 mm", "Heart"),
    dataset("range", 40, 70, "100 µm", "Heart"),
  ], axes);

  const single = layout.get("single");
  const range = layout.get("range");
  assert.ok(range.box.y1 - range.box.y0 > single.box.y1 - single.box.y0);
  assert.ok(range.geometry.bounds.height > single.geometry.bounds.height);
});

test("layoutPlot splits only overlapping datasets into lanes with the taller block behind", () => {
  const layout = layoutPlot([
    dataset("liver-45", 45, 45, "100 µm", "Liver"),
    dataset("liver-7-47", 7, 47, "100 µm", "Liver"),
    dataset("heart-63", 63, 63, "100 mm", "Heart"),
  ], axes);

  const single = layout.get("liver-45");
  const range = layout.get("liver-7-47");
  assert.ok(width(single) < fullWidth && width(range) < fullWidth);
  assert.ok(Math.abs(width(layout.get("heart-63")) - fullWidth) < 1e-9);
  assert.ok(range.box.z1 < single.box.z0, "Lanes must not overlap.");
  // Lower z is farther from the viewer, so the taller range sits behind the single age.
  assert.ok(range.box.z0 < single.box.z0);
  assert.ok(single.layer > range.layer);
});

test("layoutPlot keeps lane groups inside their organ band", () => {
  const items = ["a", "b", "c"].map((id) => dataset(id, 20, 60, "100 µm", "Heart"));
  const layout = layoutPlot(items, axes);
  const [bandStart, bandEnd] = getAxisLayout(axes).organBands[0];

  items.forEach(({ id }) => {
    assert.ok(layout.get(id).box.z0 >= bandStart && layout.get(id).box.z1 <= bandEnd, `${id} left its band`);
  });
});

test("layoutPlot keeps each dataset's exact time span even when the block is drawn taller", () => {
  const layout = layoutPlot([
    dataset("single", 45, 45, "100 µm", "Liver"),
    dataset("infant", 4 / 12, 5 / 12, "100 µm", "Thymus"),
  ], axes);

  assert.deepEqual(layout.get("single").time, { start: 0.45, end: 0.45 });
  assert.ok(layout.get("single").box.y1 - layout.get("single").box.y0 > 0);
  assert.ok(Math.abs(layout.get("infant").time.start - 4 / 1200) < 1e-12);
  assert.equal(layout.get("infant").box.y0, 0);
});

test("layoutPlot keeps separated datasets in one cell at full width", () => {
  const layout = layoutPlot([
    dataset("kidney-63", 63, 63, "100 mm", "Kidney"),
    dataset("kidney-85", 85, 85, "100 mm", "Kidney"),
  ], axes);

  assert.ok(Math.abs(width(layout.get("kidney-63")) - fullWidth) < 1e-9);
  assert.ok(Math.abs(width(layout.get("kidney-85")) - fullWidth) < 1e-9);
  assert.ok(layout.get("kidney-85").layer > layout.get("kidney-63").layer, "Upper blocks paint over lower blocks.");
});

test("layoutPlot treats touching and identical ranges as overlapping", () => {
  const touching = layoutPlot([
    dataset("lower", 20, 40, "100 µm", "Heart"),
    dataset("upper", 40, 60, "100 µm", "Heart"),
  ], axes);
  assert.ok(width(touching.get("lower")) < fullWidth && width(touching.get("upper")) < fullWidth);

  const identical = layoutPlot([
    dataset("first", 20, 60, "100 µm", "Heart"),
    dataset("second", 20, 60, "100 µm", "Heart"),
  ], axes);
  assert.notEqual(identical.get("first").box.z0, identical.get("second").box.z0);
});

test("layoutPlot narrows a whole overlap chain while unrelated blocks keep full width", () => {
  const layout = layoutPlot([
    dataset("a", 0, 30, "100 µm", "Thymus"),
    dataset("b", 25, 55, "100 µm", "Thymus"),
    dataset("c", 50, 80, "100 µm", "Thymus"),
    dataset("d", 95, 95, "100 mm", "Thymus"),
  ], axes);

  ["a", "b", "c"].forEach((id) => assert.ok(width(layout.get(id)) < fullWidth, `${id} should share lanes`));
  assert.ok(Math.abs(width(layout.get("d")) - fullWidth) < 1e-9);
  // A and C do not overlap each other, so they can reuse one lane.
  assert.equal(layout.get("a").box.z0, layout.get("c").box.z0);
});

test("layoutPlot is independent of input order", () => {
  const items = [
    dataset("liver-45", 45, 45, "100 µm", "Liver"),
    dataset("liver-7-47", 7, 47, "100 µm", "Liver"),
    dataset("kidney-63", 63, 63, "100 mm", "Kidney"),
    dataset("heart-40-70", 40, 70, "100 µm", "Heart"),
  ];
  const forward = layoutPlot(items, axes);
  const reversed = layoutPlot([...items].reverse(), axes);

  items.forEach(({ id }) => assert.deepEqual(reversed.get(id), forward.get(id)));
});

test("layoutPlot paints nearer cells over farther cells", () => {
  const layout = layoutPlot([
    dataset("farther", 50, 50, "100 µm", "Heart"),
    dataset("nearer", 50, 50, "100 mm", "Thymus"),
  ], axes);

  assert.ok(layout.get("nearer").layer > layout.get("farther").layer);
});

test("layoutPlot anchors hover cards inside the plot and picks a side", () => {
  const layout = layoutPlot([dataset("top", 100, 100, "100 µm", "Thymus")], axes);
  const block = layout.get("top");
  const anchor = block.geometry.bounds.top + (block.cardTop / 100) * block.geometry.bounds.height;

  assert.ok(anchor >= 12 && anchor <= 88);
  assert.ok(block.cardSide === "left" || block.cardSide === "right");
});

test("layoutPlot skips datasets without a usable position", () => {
  const layout = layoutPlot([
    { id: "unplotted", label: "Unplotted", status: "available" },
    dataset("unknown", 20, 20, "1 km", "Heart"),
  ], axes);

  assert.equal(layout.size, 0);
});

test("sortItemsForDisplay follows organ, space, then time, with unplotted datasets last", () => {
  const sorted = sortItemsForDisplay([
    { id: "unplotted", label: "Unplotted" },
    dataset("thymus", 0, 1, "100 µm", "Thymus"),
    dataset("heart-mm", 63, 63, "100 mm", "Heart"),
    dataset("heart-um-late", 50, 50, "100 µm", "Heart"),
    dataset("heart-um-early", 40, 70, "100 µm", "Heart"),
  ], axes);

  assert.deepEqual(sorted.map((item) => item.id), ["heart-um-early", "heart-um-late", "heart-mm", "thymus", "unplotted"]);
});

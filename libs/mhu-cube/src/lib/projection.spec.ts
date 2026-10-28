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
  PlotLayout,
  Point,
  projectPoint,
  sortItemsForDisplay,
} from './projection';
import { MhuCubeAxes, MhuCubeItem, MhuCubeTimeAxis } from './types';

const timeAxis: MhuCubeTimeAxis = { label: 'Time', unit: 'years', min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] };
const axes: MhuCubeAxes = {
  time: timeAxis,
  space: { label: 'Space', values: ['100 µm', '100 mm'] },
  organ: { label: 'Organ', values: ['Heart', 'Kidney', 'Liver', 'Thymus'] },
};

function dataset(id: string, start: number, end: number, space: string, organ: string): MhuCubeItem {
  return { id, label: id, href: `#${id}`, status: 'available', position: { time: { start, end }, space, organ } };
}

function get(layout: Map<string, PlotLayout>, id: string): PlotLayout {
  const block = layout.get(id);
  if (!block) {
    throw new Error(`${id} was not laid out`);
  }
  return block;
}

function last(points: Point[]): Point {
  const point = points.at(-1);
  if (!point) {
    throw new Error('Expected at least one point');
  }
  return point;
}

function cubeCorners(): Point[] {
  return [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => projectPoint(x, y, z))));
}

// Overlapping datasets split into lanes along the organ axis, so a block's width is its z extent.
const width = (layout: PlotLayout) => layout.box.z1 - layout.box.z0;
const fullWidth = getFootprintHalfSize(2, 4) * 2;

describe('projection', () => {
  it('getCategoryCenter centers indexes within equal categorical cells', () => {
    expect(getCategoryCenter(0, 2)).toBe(0.25);
    expect(getCategoryCenter(1, 2)).toBe(0.75);
  });

  it('getSpreadCenter separates two space values well beyond equal-width cells', () => {
    const halfSize = getFootprintHalfSize(2, 4);
    const first = getSpreadCenter(0, 2, halfSize);
    const second = getSpreadCenter(1, 2, halfSize);

    expect(second - first).toBeGreaterThan(getCategoryCenter(1, 2) - getCategoryCenter(0, 2));
    expect(Math.abs(first + second - 1), 'Spread values stay symmetric.').toBeLessThan(1e-9);
    expect(first - halfSize > 0 && second + halfSize < 1, 'Blocks stay inside the frame.').toBe(true);
    expect(getSpreadCenter(0, 1, halfSize)).toBe(0.5);
  });

  it('getSpreadCenter never packs many values tighter than equal-width cells', () => {
    const halfSize = getFootprintHalfSize(8, 4);

    for (let index = 0; index < 8; index += 1) {
      expect(Math.abs(getSpreadCenter(index, 8, halfSize) - getCategoryCenter(index, 8))).toBeLessThan(1e-9);
    }
  });

  it('getAxisLayout places the first space value in the back row and gives each organ its own lane band', () => {
    const layout = getAxisLayout(axes);

    expect(layout.space[0], 'The first space value sits toward x = 1, the back row.').toBeGreaterThan(layout.space[1]);
    expect(layout.organ).toEqual([0.125, 0.375, 0.625, 0.875]);
    expect(layout.organBands).toEqual([
      [0, 0.25],
      [0.25, 0.5],
      [0.5, 0.75],
      [0.75, 1],
    ]);
  });

  it('getFrameEdges projects all twelve edges of the bounding cube', () => {
    const edges = getFrameEdges();
    const frontEdge = edges.find(
      ([start, end]) =>
        start.x === projectPoint(0, 0, 0).x &&
        start.y === projectPoint(0, 0, 0).y &&
        end.x === projectPoint(0, 1, 0).x &&
        end.y === projectPoint(0, 1, 0).y,
    );

    expect(edges.length).toBe(12);
    expect(frontEdge, 'The front vertical edge is part of the frame.').toBeTruthy();
  });

  it('the low camera keeps floor depth well short of the time axis height on screen', () => {
    const timeHeight = projectPoint(0, 0, 0).y - projectPoint(0, 1, 0).y;
    const floorDepth = projectPoint(0, 0, 0).y - projectPoint(1, 0, 1).y;

    expect(floorDepth, 'Depth must move blocks up the screen far less than time does.').toBeLessThan(timeHeight * 0.4);
  });

  it('the frame touches all four sides of a drawing area shaped like it', () => {
    const corners = cubeCorners();
    const xs = corners.map((point) => point.x);
    const ys = corners.map((point) => point.y);
    [Math.min(...xs), Math.min(...ys)].forEach((value) =>
      expect(Math.abs(value), 'The frame reaches the left and top.').toBeLessThan(1e-9),
    );
    [Math.max(...xs), Math.max(...ys)].forEach((value) =>
      expect(Math.abs(value - 100), 'The frame reaches the right and bottom.').toBeLessThan(1e-9),
    );
    // The camera faces the organs head-on, so the drawing area is almost square.
    expect(Math.abs(DRAWING_AREA_RATIO - 1)).toBeLessThan(0.001);
  });

  it('getAxisEdges points every label direction away from the cube', () => {
    const { time, space, organ } = getAxisEdges();
    [time, space, organ].forEach(({ normal }) =>
      expect(Math.abs(Math.hypot(normal.x, normal.y) - 1)).toBeLessThan(1e-9),
    );

    expect(time.normal.x, 'Time ticks sit to the left of the left edge.').toBeLessThan(-0.9);
    expect(space.normal.x, 'Space labels sit to the right of the right floor edge.').toBeGreaterThan(0);
    expect(time.end).toEqual(projectPoint(0, 1, 0));
  });

  it('the camera faces the organ axis with a level front edge and labels hanging straight below it', () => {
    const { organ, time } = getAxisEdges();

    expect(projectPoint(0, 0, 0).y).toBe(projectPoint(0, 0, 1).y);
    expect(
      Math.abs(organ.normal.x) < 1e-9 && organ.normal.y > 0.99,
      'Organ labels hang straight below the front edge.',
    ).toBe(true);
    const frameX = getFrameEdges()
      .flat()
      .map((point) => point.x);
    expect(time.start.x, 'Time ticks run up the leftmost edge.').toBe(Math.min(...frameX));
  });

  it("the camera keeps each organ's space rows in its own column", () => {
    const layout = getAxisLayout(axes);
    const rowShift = Math.abs(projectPoint(layout.space[0], 0, 0.5).x - projectPoint(layout.space[1], 0, 0.5).x);
    const organSpacing = projectPoint(0, 0, layout.organ[1]).x - projectPoint(0, 0, layout.organ[0]).x;

    expect(rowShift, "The back row must not drift into the next organ's column.").toBeLessThan(organSpacing / 3);
  });

  it('time guides and level lines start and end on the time tick edge', () => {
    const { time } = getAxisEdges();
    const tickAt = (y: number): Point => ({
      x: time.start.x + (time.end.x - time.start.x) * y,
      y: time.start.y + (time.end.y - time.start.y) * y,
    });
    const guide = getTimeGuide(0.4);
    expect(
      Math.abs(guide[0].x - tickAt(0.4).x) < 1e-9 && Math.abs(guide[0].y - tickAt(0.4).y) < 1e-9,
      'The guide starts at the ticks',
    ).toBe(true);

    const block = get(layoutPlot([dataset('range', 20, 60, '100 µm', 'Heart')], axes), 'range');
    block.leaders.forEach((leader, index) => {
      const end = last(leader);
      const level = index === 0 ? 0.2 : 0.6;
      expect(
        Math.abs(end.x - tickAt(level).x) < 1e-9 && Math.abs(end.y - tickAt(level).y) < 1e-9,
        'The level line ends at its tick',
      ).toBe(true);
    });
    expect(Math.abs(block.bracket[1].y - tickAt(0.6).y), "The bracket ends at the range's end").toBeLessThan(1e-9);
  });

  it('layoutPlot splits overlapping datasets side by side within their organ', () => {
    const layout = layoutPlot(
      [dataset('liver-45', 45, 45, '100 µm', 'Liver'), dataset('liver-7-47', 7, 47, '100 µm', 'Liver')],
      axes,
    );
    const single = get(layout, 'liver-45').box;
    const range = get(layout, 'liver-7-47').box;
    const [bandStart, bandEnd] = getAxisLayout(axes).organBands[2];

    expect(single.x0, 'Lanes share the space row.').toBe(range.x0);
    expect(single.z1 < range.z0 || range.z1 < single.z0, 'Lanes sit side by side along the organ axis.').toBe(true);
    [single, range].forEach((box) =>
      expect(box.z0 >= bandStart && box.z1 <= bandEnd, 'Lanes stay inside their organ.').toBe(true),
    );
    expect(range.z0, 'The taller range takes the lane farther from the camera.').toBeLessThan(single.z0);
  });

  it('layoutPlot paints the front row and right-hand neighbors over what sits behind them', () => {
    const layout = layoutPlot(
      [
        dataset('back', 50, 50, '100 µm', 'Heart'),
        dataset('front', 50, 50, '100 mm', 'Heart'),
        dataset('right', 50, 50, '100 mm', 'Kidney'),
      ],
      axes,
    );
    const front = get(layout, 'front');

    expect(front.layer).toBeGreaterThan(get(layout, 'back').layer);
    expect(get(layout, 'right').layer).toBeGreaterThan(front.layer);
    expect(front.geometry.corners.topFront).toEqual(projectPoint(front.box.x0, front.box.y1, front.box.z1));
  });

  it('blocks resting on the floor have no drop lines', () => {
    const layout = layoutPlot(
      [dataset('infant', 4 / 12, 5 / 12, '100 µm', 'Thymus'), dataset('raised', 60, 60, '100 µm', 'Heart')],
      axes,
    );

    expect(get(layout, 'infant').drops).toEqual([]);
    expect(get(layout, 'raised').drops.length).toBe(3);
    expect(get(layout, 'raised').floor.length).toBe(4);
  });

  it('getTimeCoordinate maps the time domain onto the vertical axis', () => {
    expect(getTimeCoordinate(0, timeAxis)).toBe(0);
    expect(getTimeCoordinate(45, timeAxis)).toBe(0.45);
    expect(getTimeCoordinate(100, timeAxis)).toBe(1);
  });

  it('getFootprintHalfSize sizes blocks from the denser categorical axis', () => {
    expect(getFootprintHalfSize(2, 4)).toBe(getFootprintHalfSize(4, 2));
    expect(getFootprintHalfSize(2, 4)).toBeLessThan(getFootprintHalfSize(2, 2));
  });

  it('getRenderedTimeExtent keeps long ranges exact and grows short ranges to a cube', () => {
    expect(getRenderedTimeExtent({ start: 7, end: 47 }, timeAxis, 0.175)).toEqual({ y0: 0.07, y1: 0.47 });
    const single = getRenderedTimeExtent({ start: 45, end: 45 }, timeAxis, 0.175);
    expect(Math.abs(single.y1 - single.y0 - 0.175)).toBeLessThan(1e-9);
    expect(Math.abs((single.y0 + single.y1) / 2 - 0.45)).toBeLessThan(1e-9);
  });

  it('getRenderedTimeExtent shifts edge blocks inward instead of clipping them', () => {
    const infant = getRenderedTimeExtent({ start: 4 / 12, end: 5 / 12 }, timeAxis, 0.175);
    expect(infant.y0).toBe(0);
    expect(Math.abs(infant.y1 - 0.175)).toBeLessThan(1e-9);
    const oldest = getRenderedTimeExtent({ start: 100, end: 100 }, timeAxis, 0.175);
    expect(oldest.y1).toBe(1);
    expect(Math.abs(oldest.y1 - oldest.y0 - 0.175)).toBeLessThan(1e-9);
  });

  it('projectPoint returns finite perspective coordinates', () => {
    const point = projectPoint(0.5, 0.5, 0.5);

    expect(Number.isFinite(point.x)).toBe(true);
    expect(Number.isFinite(point.y)).toBe(true);
    expect(point.x > 0 && point.x < 100).toBe(true);
    expect(point.y > 0 && point.y < 100).toBe(true);
  });

  it('getProjectedBoxGeometry returns positive bounds around every corner', () => {
    const geometry = getProjectedBoxGeometry({ x0: 0.2, x1: 0.4, y0: 0.1, y1: 0.7, z0: 0.5, z1: 0.7 });
    const corners = Object.values(geometry.corners);

    expect(geometry.bounds.width).toBeGreaterThan(0);
    expect(geometry.bounds.height).toBeGreaterThan(0);
    expect(corners.every((point) => point.x >= geometry.bounds.left)).toBe(true);
    expect(corners.every((point) => point.x <= geometry.bounds.left + geometry.bounds.width)).toBe(true);
    expect(corners.every((point) => point.y >= geometry.bounds.top)).toBe(true);
    expect(corners.every((point) => point.y <= geometry.bounds.top + geometry.bounds.height)).toBe(true);
  });

  it('layoutPlot draws time ranges as taller blocks than single ages', () => {
    const layout = layoutPlot(
      [dataset('single', 63, 63, '100 mm', 'Heart'), dataset('range', 40, 70, '100 µm', 'Heart')],
      axes,
    );

    const single = get(layout, 'single');
    const range = get(layout, 'range');
    expect(range.box.y1 - range.box.y0).toBeGreaterThan(single.box.y1 - single.box.y0);
    expect(range.geometry.bounds.height).toBeGreaterThan(single.geometry.bounds.height);
  });

  it('layoutPlot splits only overlapping datasets into lanes with the taller block behind', () => {
    const layout = layoutPlot(
      [
        dataset('liver-45', 45, 45, '100 µm', 'Liver'),
        dataset('liver-7-47', 7, 47, '100 µm', 'Liver'),
        dataset('heart-63', 63, 63, '100 mm', 'Heart'),
      ],
      axes,
    );

    const single = get(layout, 'liver-45');
    const range = get(layout, 'liver-7-47');
    expect(width(single) < fullWidth && width(range) < fullWidth).toBe(true);
    expect(Math.abs(width(get(layout, 'heart-63')) - fullWidth)).toBeLessThan(1e-9);
    expect(range.box.z1, 'Lanes must not overlap.').toBeLessThan(single.box.z0);
    // Lower z is farther from the viewer, so the taller range sits behind the single age.
    expect(range.box.z0).toBeLessThan(single.box.z0);
    expect(single.layer).toBeGreaterThan(range.layer);
  });

  it('layoutPlot keeps lane groups inside their organ band', () => {
    const items = ['a', 'b', 'c'].map((id) => dataset(id, 20, 60, '100 µm', 'Heart'));
    const layout = layoutPlot(items, axes);
    const [bandStart, bandEnd] = getAxisLayout(axes).organBands[0];

    items.forEach(({ id }) => {
      const { box } = get(layout, id);
      expect(box.z0 >= bandStart && box.z1 <= bandEnd, `${id} left its band`).toBe(true);
    });
  });

  it("layoutPlot keeps each dataset's exact time span even when the block is drawn taller", () => {
    const layout = layoutPlot(
      [dataset('single', 45, 45, '100 µm', 'Liver'), dataset('infant', 4 / 12, 5 / 12, '100 µm', 'Thymus')],
      axes,
    );

    expect(get(layout, 'single').time).toEqual({ start: 0.45, end: 0.45 });
    expect(get(layout, 'single').box.y1 - get(layout, 'single').box.y0).toBeGreaterThan(0);
    expect(Math.abs(get(layout, 'infant').time.start - 4 / 1200)).toBeLessThan(1e-12);
    expect(get(layout, 'infant').box.y0).toBe(0);
  });

  it('layoutPlot keeps separated datasets in one cell at full width', () => {
    const layout = layoutPlot(
      [dataset('kidney-63', 63, 63, '100 mm', 'Kidney'), dataset('kidney-85', 85, 85, '100 mm', 'Kidney')],
      axes,
    );

    expect(Math.abs(width(get(layout, 'kidney-63')) - fullWidth)).toBeLessThan(1e-9);
    expect(Math.abs(width(get(layout, 'kidney-85')) - fullWidth)).toBeLessThan(1e-9);
    expect(get(layout, 'kidney-85').layer, 'Upper blocks paint over lower blocks.').toBeGreaterThan(
      get(layout, 'kidney-63').layer,
    );
  });

  it('layoutPlot treats touching and identical ranges as overlapping', () => {
    const touching = layoutPlot(
      [dataset('lower', 20, 40, '100 µm', 'Heart'), dataset('upper', 40, 60, '100 µm', 'Heart')],
      axes,
    );
    expect(width(get(touching, 'lower')) < fullWidth && width(get(touching, 'upper')) < fullWidth).toBe(true);

    const identical = layoutPlot(
      [dataset('first', 20, 60, '100 µm', 'Heart'), dataset('second', 20, 60, '100 µm', 'Heart')],
      axes,
    );
    expect(get(identical, 'first').box.z0).not.toBe(get(identical, 'second').box.z0);
  });

  it('layoutPlot narrows a whole overlap chain while unrelated blocks keep full width', () => {
    const layout = layoutPlot(
      [
        dataset('a', 0, 30, '100 µm', 'Thymus'),
        dataset('b', 25, 55, '100 µm', 'Thymus'),
        dataset('c', 50, 80, '100 µm', 'Thymus'),
        dataset('d', 95, 95, '100 mm', 'Thymus'),
      ],
      axes,
    );

    ['a', 'b', 'c'].forEach((id) => expect(width(get(layout, id)), `${id} should share lanes`).toBeLessThan(fullWidth));
    expect(Math.abs(width(get(layout, 'd')) - fullWidth)).toBeLessThan(1e-9);
    // A and C do not overlap each other, so they can reuse one lane.
    expect(get(layout, 'a').box.z0).toBe(get(layout, 'c').box.z0);
  });

  it('layoutPlot is independent of input order', () => {
    const items = [
      dataset('liver-45', 45, 45, '100 µm', 'Liver'),
      dataset('liver-7-47', 7, 47, '100 µm', 'Liver'),
      dataset('kidney-63', 63, 63, '100 mm', 'Kidney'),
      dataset('heart-40-70', 40, 70, '100 µm', 'Heart'),
    ];
    const forward = layoutPlot(items, axes);
    const reversed = layoutPlot([...items].reverse(), axes);

    items.forEach(({ id }) => expect(reversed.get(id)).toEqual(forward.get(id)));
  });

  it('layoutPlot paints nearer cells over farther cells', () => {
    const layout = layoutPlot(
      [dataset('farther', 50, 50, '100 µm', 'Heart'), dataset('nearer', 50, 50, '100 mm', 'Thymus')],
      axes,
    );

    expect(get(layout, 'nearer').layer).toBeGreaterThan(get(layout, 'farther').layer);
  });

  it('layoutPlot anchors hover cards inside the plot and picks a side', () => {
    const layout = layoutPlot([dataset('top', 100, 100, '100 µm', 'Thymus')], axes);
    const block = get(layout, 'top');
    const anchor = block.geometry.bounds.top + (block.cardTop / 100) * block.geometry.bounds.height;

    expect(anchor).toBeGreaterThanOrEqual(12);
    expect(anchor).toBeLessThanOrEqual(88);
    expect(['left', 'right']).toContain(block.cardSide);
  });

  it('layoutPlot skips datasets without a usable position', () => {
    const layout = layoutPlot(
      [{ id: 'unplotted', label: 'Unplotted', status: 'available' }, dataset('unknown', 20, 20, '1 km', 'Heart')],
      axes,
    );

    expect(layout.size).toBe(0);
  });

  it('sortItemsForDisplay follows organ, space, then time, with unplotted datasets last', () => {
    const sorted = sortItemsForDisplay(
      [
        { id: 'unplotted', label: 'Unplotted' },
        dataset('thymus', 0, 1, '100 µm', 'Thymus'),
        dataset('heart-mm', 63, 63, '100 mm', 'Heart'),
        dataset('heart-um-late', 50, 50, '100 µm', 'Heart'),
        dataset('heart-um-early', 40, 70, '100 µm', 'Heart'),
      ],
      axes,
    );

    expect(sorted.map((item) => item.id)).toEqual([
      'heart-um-early',
      'heart-um-late',
      'heart-mm',
      'thymus',
      'unplotted',
    ]);
  });
});

import { axes, dataset } from '../../testing/geometry-fixtures';
import { layoutPlot } from './layout';
import { getAxisEdges, getAxisLayout, getFootprintHalfSize, getTimeGuide, projectPoint } from './projection';
import type { PlotLayout, Point } from './types';

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

// Overlapping datasets split into lanes along the organ axis, so a block's width is its z extent.
const width = (layout: PlotLayout) => layout.box.z1 - layout.box.z0;
const fullWidth = getFootprintHalfSize(2, 4) * 2;

describe('plot layout', () => {
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
});

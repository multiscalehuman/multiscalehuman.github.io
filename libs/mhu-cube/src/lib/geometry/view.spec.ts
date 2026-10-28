import { axes } from '../../testing/geometry-fixtures';
import { getAxisEdges, getAxisLayout, getFrameEdges, projectPoint } from './projection';
import type { Point } from './types';
import { DRAWING_AREA_RATIO } from './view';

function cubeCorners(): Point[] {
  return [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => projectPoint(x, y, z))));
}

describe('camera view', () => {
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
});

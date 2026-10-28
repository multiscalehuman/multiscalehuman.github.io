import type { MhuCube } from '../../src/index';
import { assert, nextLayout, waitFor, test, type HarnessContext } from '../runner';

/**
 * Checks block sizing, lanes, shadows, time markers, and pointer hit testing.
 * @param context - The shared component and its data.
 * @returns A promise that resolves after every check has run.
 */
export async function blocksSuite({ component, fixture, axes }: HarnessContext) {
  await test('time ranges draw taller blocks and overlapping ranges split their cell into lanes', () => {
    const block = (id: string) =>
      component.querySelector<SVGSVGElement>(`[data-item-id="${id}"] .mhu-cube__cube`)?.getBoundingClientRect();
    const single = block('one');
    const range = block('two');
    const overlapping = block('three');
    assert(single && range && overlapping, 'Fixture blocks are missing.');
    assert(range.height > overlapping.height, 'A longer time range should draw a taller block.');
    assert(overlapping.width < single.width, 'Overlapping datasets should narrow into lanes.');
  });

  await test('blocks cast floor shadows and reveal their exact time span when selected', async () => {
    const marker = () => {
      const element = component.querySelector<SVGGElement>('[data-item-id="two"] .mhu-cube__time-marker');
      assert(element, 'Dataset two needs a time marker.');
      return element;
    };
    assert(
      [...component.querySelectorAll('.mhu-cube__select')].every((button) =>
        button.querySelector('.mhu-cube__shadow .mhu-cube__shadow-floor'),
      ),
      'Every block needs a floor footprint.',
    );
    assert(
      component.querySelector('[data-item-id="one"] .mhu-cube__shadow-drop'),
      'A raised block needs drop lines to its footprint.',
    );
    assert(getComputedStyle(marker()).opacity === '0', 'Age markers should stay hidden until a block is active.');

    // Clear the selection even when an assertion fails, so later tests start from the same state.
    try {
      component.selectedId = 'two';
      await waitFor(() => getComputedStyle(marker()).opacity === '1');
      // Measure the path's geometry rather than its client rect: Firefox includes the stroke and its round caps in
      // getBoundingClientRect(), which makes the bracket look taller than the range it marks.
      const bracketPath = component.querySelector<SVGPathElement>('[data-item-id="two"] .mhu-cube__time-bracket');
      const bracketScale = bracketPath?.getScreenCTM()?.d;
      const bracket = bracketPath && bracketScale ? { height: bracketPath.getBBox().height * bracketScale } : undefined;
      const tickCenter = (text: string) => {
        const label = [...component.querySelectorAll<HTMLElement>('.mhu-cube__axis-value--time')].find(
          (tick) => tick.textContent === text,
        );
        const rect = label?.getBoundingClientRect();
        return rect ? rect.top + rect.height / 2 : NaN;
      };
      const axisHeight = tickCenter('0') - tickCenter('100');
      assert(bracket && axisHeight > 0, 'The time bracket and axis ticks are missing.');
      // The fixture's "two" spans 10–60 years, half of the 0–100 axis.
      assert(
        Math.abs(bracket.height / axisHeight - 0.5) < 0.05,
        "The bracket should span the dataset's exact time range on the axis.",
      );
    } finally {
      component.selectedId = null;
      await nextLayout();
    }
  });

  await test('pointer input follows painted faces rather than block bounding boxes', async () => {
    // The bounding box of a short front-row block reaches over the tall back-row block behind it. Where only the
    // back block is painted, the pointer must reach it rather than the empty corner of the block in front.
    const overlapComponent = document.createElement('mhu-cube') as MhuCube;
    fixture?.append(overlapComponent);
    overlapComponent.axes = axes;
    overlapComponent.items = [
      {
        id: 'back',
        label: 'Back',
        href: '#back',
        position: { time: { start: 10, end: 90 }, space: 'small', organ: 'Heart' },
      },
      {
        id: 'front',
        label: 'Front',
        href: '#front',
        position: { time: { start: 50, end: 50 }, space: 'large', organ: 'Heart' },
      },
    ];
    await nextLayout();
    try {
      const front = overlapComponent.querySelector<HTMLButtonElement>('[data-item-id="front"]');
      const faces = (id: string) => [
        ...overlapComponent.querySelectorAll<SVGPolygonElement>(`[data-item-id="${id}"] .mhu-cube__cube polygon`),
      ];
      const paints = (id: string, x: number, y: number) =>
        faces(id).some((face) => {
          const matrix = face.getScreenCTM()?.inverse();
          const point = face.ownerSVGElement?.createSVGPoint();
          if (!matrix || !point) {
            return false;
          }
          point.x = x;
          point.y = y;
          return face.isPointInFill(point.matrixTransform(matrix));
        });
      assert(front && faces('front').length === 3 && faces('back').length === 3, 'Fixture blocks are missing.');
      front.scrollIntoView({ block: 'center' });
      await nextLayout();
      const box = front.getBoundingClientRect();
      // Probe clear of the front block's edges: browsers round hit testing at a face's edge differently from
      // isPointInFill(), especially with display scaling.
      const margin = 3;
      const clearOfFront = (x: number, y: number) =>
        [-margin, 0, margin].every((dy) => [-margin, 0, margin].every((dx) => !paints('front', x + dx, y + dy)));
      let probe: { x: number; y: number } | undefined;
      for (let y = Math.ceil(box.top) + 0.5; y < box.bottom && !probe; y += 1) {
        for (let x = Math.ceil(box.left) + 0.5; x < box.right && !probe; x += 1) {
          if (paints('back', x, y) && clearOfFront(x, y)) {
            probe = { x, y };
          }
        }
      }
      assert(probe, "Fixture should paint the back block inside the front block's bounding box.");
      const target = document.elementFromPoint(probe.x, probe.y)?.closest<HTMLButtonElement>('button');
      assert(
        target?.dataset['itemId'] === 'back',
        'The visible back block should receive the pointer, not the block in front.',
      );
    } finally {
      overlapComponent.remove();
    }
  });
}

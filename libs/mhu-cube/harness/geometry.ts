import { assert } from './runner';

/**
 * Fails when any axis label overlaps another label or a frame edge, or spills outside the component.
 * @param root - The component element.
 * @returns Nothing.
 */
export function assertAxisLabelsClear(root: HTMLElement) {
  const labels = [...root.querySelectorAll<HTMLElement>('.mhu-cube__axis-title, .mhu-cube__axis-value')].map(
    (label) => ({ text: label.textContent, rect: label.getBoundingClientRect() }),
  );
  const frame = root.querySelector<SVGSVGElement>('.mhu-cube__frame');
  const numbers =
    frame
      ?.querySelector('.mhu-cube__frame-line')
      ?.getAttribute('d')
      ?.match(/-?[\d.]+/g)
      ?.map(Number) ?? [];
  assert(frame && numbers.length === 48, 'The frame should draw twelve edges.');
  const bounds = frame.getBoundingClientRect();
  const toScreen = (x: number, y: number) => ({
    x: bounds.left + (x / 100) * bounds.width,
    y: bounds.top + (y / 100) * bounds.height,
  });
  const edges = Array.from({ length: 12 }, (_, index) => [
    toScreen(numbers[index * 4], numbers[index * 4 + 1]),
    toScreen(numbers[index * 4 + 2], numbers[index * 4 + 3]),
  ]);
  const crossesEdge = (rect: DOMRect) =>
    edges.some(([start, end]) =>
      Array.from({ length: 101 }, (_, step) => step / 100).some((t) => {
        const x = start.x + (end.x - start.x) * t;
        const y = start.y + (end.y - start.y) * t;
        return x > rect.left && x < rect.right && y > rect.top && y < rect.bottom;
      }),
    );
  const host = root.getBoundingClientRect();
  const plot = root.querySelector('.mhu-cube__plot')?.getBoundingClientRect();
  assert(plot, 'The plot is missing.');
  labels.forEach(({ text, rect }, index) => {
    assert(!crossesEdge(rect), `Axis label “${text}” overlaps the frame.`);
    assert(
      rect.left >= host.left && rect.right <= host.right && rect.bottom <= host.bottom,
      `Axis label “${text}” spills outside the component.`,
    );
    assert(rect.left >= plot.left, `Axis label “${text}” reaches past the plot toward the introduction.`);
    labels.slice(index + 1).forEach((other) => {
      const overlaps =
        rect.left < other.rect.right &&
        other.rect.left < rect.right &&
        rect.top < other.rect.bottom &&
        other.rect.top < rect.bottom;
      assert(!overlaps, `Axis labels “${text}” and “${other.text}” overlap.`);
    });
  });
}

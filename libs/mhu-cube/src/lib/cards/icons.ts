import { svg } from '../dom/create-element';

/**
 * Creates the Material close glyph used by the desktop details button.
 * @returns A decorative 24-pixel SVG icon that inherits the button color.
 */
export function createCloseIcon(): SVGSVGElement {
  return svg(
    'svg',
    {
      class: 'mhu-cube__details-close-icon',
      width: 24,
      height: 24,
      viewBox: '0 -960 960 960',
      fill: 'currentColor',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    [
      svg('path', {
        d: 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z',
      }),
    ],
  );
}

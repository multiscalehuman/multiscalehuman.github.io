/**
 * Creates the Material close glyph used by the desktop details button.
 * @returns A decorative 24-pixel SVG icon that inherits the button color.
 */
export function createCloseIcon() {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.classList.add('mhu-cube__details-close-icon');
  icon.setAttribute('width', '24');
  icon.setAttribute('height', '24');
  icon.setAttribute('viewBox', '0 -960 960 960');
  icon.setAttribute('fill', 'currentColor');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z',
  );
  icon.append(path);
  return icon;
}

import type { Point } from '../geometry/types';

/** Namespace for every SVG element the component creates. */
export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Builds SVG path data in plot percentages, the coordinate space shared by the frame and every block.
 * @param segments - Polylines to draw, each a list of projected points.
 * @returns Path data with one move command per polyline.
 */
export function toPathData(segments: Point[][]): string {
  return segments
    .filter((points) => points.length > 1)
    .map((points) => points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(''))
    .join('');
}

/**
 * Creates an SVG element in the SVG namespace and sets its attributes.
 * @param tagName - SVG tag to create, which also determines the returned element type.
 * @param attributes - Attribute names and values to set, in order.
 * @returns The new, unattached SVG element.
 */
export function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NAMESPACE, tagName);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

import { MHU_CUBE_INTRO_CONTENT } from '../content/intro-content';
import { h } from '../dom/create-element';

/**
 * Creates the component introduction shared by desktop and compact layouts.
 * @param details - Persistent desktop details region displayed in place of the dimension key.
 * @returns A heading group containing the configured introduction copy and details region.
 */
export function createIntro(details: HTMLElement): HTMLElement {
  const { eyebrow, heading, compactHeading, compactDescription, visualization } = MHU_CUBE_INTRO_CONTENT;
  const { attribution } = visualization;
  return h('header', { className: 'mhu-cube__intro' }, [
    eyebrow && h('p', { className: 'mhu-cube__eyebrow mhu-cube__intro-eyebrow', text: eyebrow }),
    // One heading whose text suits each layout; the hidden variant leaves the accessibility tree with display: none.
    h('h2', { className: 'mhu-cube__intro-heading' }, [
      h('span', { className: 'mhu-cube__intro-heading-wide', text: heading }),
      h('span', { className: 'mhu-cube__intro-heading-compact', text: compactHeading }),
    ]),
    // The compact lead sentence stands in for the desktop guidance, which compact layouts remove.
    compactDescription && h('p', { className: 'mhu-cube__intro-summary-compact', text: compactDescription }),
    h('div', { className: 'mhu-cube__intro-visualization' }, [
      h('p', { className: 'mhu-cube__intro-summary', text: visualization.description }),
      h(
        'div',
        { className: 'mhu-cube__intro-dimensions-header', attrs: { 'aria-hidden': 'true' } },
        visualization.dimensionHeadings.map((headingText) => h('span', { text: headingText })),
      ),
      h(
        'dl',
        { className: 'mhu-cube__intro-dimensions' },
        visualization.dimensions.map((dimension) =>
          h('div', { className: 'mhu-cube__intro-dimensions-row' }, [
            h('dt', { text: dimension.term }),
            h('dd', { text: dimension.description }),
          ]),
        ),
      ),
      details,
      h('p', { className: 'mhu-cube__intro-attribution' }, [
        attribution.beforeLink,
        h('a', { attrs: { href: attribution.href }, text: attribution.linkText }),
        attribution.afterLink,
      ]),
    ]),
  ]);
}

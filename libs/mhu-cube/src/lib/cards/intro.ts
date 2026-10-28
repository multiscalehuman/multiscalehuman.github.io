import { MHU_CUBE_INTRO_CONTENT } from '../content/intro-content';

/**
 * Creates the component introduction shared by desktop and compact layouts.
 * @param details - Persistent desktop details region displayed in place of the dimension key.
 * @returns A heading group containing the configured introduction copy and details region.
 */
export function createIntro(details: HTMLElement) {
  const intro = document.createElement('header');
  intro.className = 'mhu-cube__intro';
  if (MHU_CUBE_INTRO_CONTENT.eyebrow) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'mhu-cube__eyebrow mhu-cube__intro-eyebrow';
    eyebrow.textContent = MHU_CUBE_INTRO_CONTENT.eyebrow;
    intro.append(eyebrow);
  }
  // One heading whose text suits each layout; the hidden variant leaves the accessibility tree with display: none.
  const heading = document.createElement('h2');
  heading.className = 'mhu-cube__intro-heading';
  const wideHeading = document.createElement('span');
  wideHeading.className = 'mhu-cube__intro-heading-wide';
  wideHeading.textContent = MHU_CUBE_INTRO_CONTENT.heading;
  const compactHeading = document.createElement('span');
  compactHeading.className = 'mhu-cube__intro-heading-compact';
  compactHeading.textContent = MHU_CUBE_INTRO_CONTENT.compactHeading;
  heading.append(wideHeading, compactHeading);
  intro.append(heading);
  // The compact lead sentence stands in for the desktop guidance, which compact layouts remove.
  if (MHU_CUBE_INTRO_CONTENT.compactDescription) {
    const compactDescription = document.createElement('p');
    compactDescription.className = 'mhu-cube__intro-summary-compact';
    compactDescription.textContent = MHU_CUBE_INTRO_CONTENT.compactDescription;
    intro.append(compactDescription);
  }

  const visualization = document.createElement('div');
  visualization.className = 'mhu-cube__intro-visualization';
  const visualizationDescription = document.createElement('p');
  visualizationDescription.className = 'mhu-cube__intro-summary';
  visualizationDescription.textContent = MHU_CUBE_INTRO_CONTENT.visualization.description;
  const dimensionHeadings = document.createElement('div');
  dimensionHeadings.className = 'mhu-cube__intro-dimensions-header';
  dimensionHeadings.setAttribute('aria-hidden', 'true');
  MHU_CUBE_INTRO_CONTENT.visualization.dimensionHeadings.forEach((headingText) => {
    const dimensionHeading = document.createElement('span');
    dimensionHeading.textContent = headingText;
    dimensionHeadings.append(dimensionHeading);
  });
  const dimensions = document.createElement('dl');
  dimensions.className = 'mhu-cube__intro-dimensions';
  MHU_CUBE_INTRO_CONTENT.visualization.dimensions.forEach((dimension) => {
    const row = document.createElement('div');
    row.className = 'mhu-cube__intro-dimensions-row';
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = dimension.term;
    description.textContent = dimension.description;
    row.append(term, description);
    dimensions.append(row);
  });
  const attribution = document.createElement('p');
  attribution.className = 'mhu-cube__intro-attribution';
  const attributionLink = document.createElement('a');
  attributionLink.href = MHU_CUBE_INTRO_CONTENT.visualization.attribution.href;
  attributionLink.textContent = MHU_CUBE_INTRO_CONTENT.visualization.attribution.linkText;
  attribution.append(
    MHU_CUBE_INTRO_CONTENT.visualization.attribution.beforeLink,
    attributionLink,
    MHU_CUBE_INTRO_CONTENT.visualization.attribution.afterLink,
  );
  visualization.append(visualizationDescription, dimensionHeadings, dimensions, details, attribution);
  intro.append(visualization);
  return intro;
}

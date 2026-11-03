import type { MhuCubeIntroContent } from './types';

/** The introduction's text. Edit wording here; tests read it rather than repeating it. */
export const MHU_CUBE_INTRO_CONTENT: MhuCubeIntroContent = {
  eyebrow: 'Explore',
  heading: 'Space Time Organ Graph',
  compactHeading: 'Space Time Organ Datasets',
  // The counts describe the preview's datasets; update them here and in the visualization description together.
  compactDescription: '7 experimental datasets from 4 international teams, by physical scale, donor age, and organ.',
  visualization: {
    // The counts describe the preview's datasets; update them here and in the compact description together.
    description:
      'Compare 7 experimental datasets from 4 international teams across space, time, and organs. Select a block to view its details.',
    dimensionHeadings: ['Dimension', 'What it represents'],
    dimensions: [
      {
        term: 'Space',
        description: 'Physical scale the dataset captures',
      },
      {
        term: 'Time',
        description: 'Donor age in years; taller blocks span an age range',
      },
      {
        term: 'Organ',
        description: 'Tissue source, listed alphabetically',
      },
    ],
    attribution: [
      'Visualization inspired by ',
      { text: 'Metacube', href: 'https://github.com/Chair-for-Clinical-Bioinformatics/metacube' },
      ' from the Chair for Clinical Bioinformatics at ',
      { text: 'Saarland University', href: 'https://www.ccb.uni-saarland.de/' },
      ' in Germany.',
    ],
  },
};

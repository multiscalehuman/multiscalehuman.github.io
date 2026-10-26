export interface MhuCubeDimensionCopy {
  term: string;
  description: string;
}

export interface MhuCubeAttributionCopy {
  beforeLink: string;
  linkText: string;
  afterLink: string;
  href: string;
}

export interface MhuCubeVisualizationCopy {
  description: string;
  dimensionHeadings: [string, string];
  dimensions: MhuCubeDimensionCopy[];
  attribution: MhuCubeAttributionCopy;
}

export interface MhuCubeIntroCopy {
  eyebrow?: string;
  /** Desktop heading, beside the visualization; it stays on one line. */
  heading: string;
  /** Compact heading, above the dataset cards; compact layouts have no body text. */
  compactHeading: string;
  visualization: MhuCubeVisualizationCopy;
}

export const MHU_CUBE_INTRO_COPY: MhuCubeIntroCopy = {
  eyebrow: "Explore",
  heading: "Space Time Organ Graph",
  compactHeading: "Space Time Organ Graph",
  visualization: {
    // The counts describe the preview's datasets; update them when the data changes.
    description: "Compare 7 experimental datasets from 4 international teams across time, space, and organs. Select a block to view its details.",
    dimensionHeadings: ["Dimension", "What it represents"],
    dimensions: [
      {
        term: "Time",
        description: "Donor age in years; taller blocks span an age range",
      },
      {
        term: "Space",
        description: "Physical scale the dataset captures",
      },
      {
        term: "Organ",
        description: "Tissue source, listed alphabetically",
      },
    ],
    attribution: {
      beforeLink: "Visualization inspired by ",
      linkText: "Metacube",
      afterLink: " from the Chair for Clinical Bioinformatics.",
      href: "https://github.com/Chair-for-Clinical-Bioinformatics/metacube",
    },
  },
};

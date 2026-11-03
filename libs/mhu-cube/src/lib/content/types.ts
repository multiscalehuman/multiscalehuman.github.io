/** One row of the desktop dimension key. */
export interface MhuCubeDimensionContent {
  term: string;
  description: string;
}

/** A link within a copy sentence. */
export interface MhuCubeLinkContent {
  text: string;
  href: string;
}

/** The visualization credit: a sentence of text and links, in reading order. */
export type MhuCubeAttributionContent = (string | MhuCubeLinkContent)[];

/** Desktop guidance beside the visualization: its description, dimension key, and credit. */
export interface MhuCubeVisualizationContent {
  description: string;
  dimensionHeadings: [string, string];
  dimensions: MhuCubeDimensionContent[];
  attribution: MhuCubeAttributionContent;
}

/** Text for the introduction shared by desktop and compact layouts. */
export interface MhuCubeIntroContent {
  eyebrow?: string;
  /** Desktop heading, beside the visualization; it stays on one line. */
  heading: string;
  /** Compact heading, above the dataset cards. */
  compactHeading: string;
  /** Compact lead sentence, between the compact heading and the dataset cards. */
  compactDescription?: string;
  visualization: MhuCubeVisualizationContent;
}

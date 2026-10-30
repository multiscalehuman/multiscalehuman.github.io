import { ContentNode } from '@atlasng/content-blocks/types';

/**
 * Titled section of a metadata page. The page renders the heading; the body is AtlasNG content-blocks content, using
 * the design-system definitions (e.g. `ContentParagraph`, `TextLink`) and the portal ones (`List`, `ListItem`, `Cite`,
 * `Embed`, `Image`) registered in the app config.
 */
export interface MetadataSection {
  /** Heading text, also used for the table of contents entry. */
  title: string;
  /**
   * ID of the section heading and its URL fragment, for example `data-overview` in `…/heart-100um#data-overview`.
   * Must be unique within the dataset; changing it breaks existing links to the section.
   */
  anchor: string;
  /** Section body, in display order. */
  content: ContentNode[];
}

/** Content rendered by the metadata page for one dataset. */
export interface DatasetMetadata {
  /** Organ, the first part of the title, for example "Heart". */
  organ: string;
  /** Spatial scale, the second part of the title, for example "100 µm". */
  space: string;
  /** Age range, the last part of the title, for example "~40–70 years". */
  time: string;
  /** One-sentence description shown below the title. */
  description: string;
  /** Sections, in display order. */
  sections: MetadataSection[];
  /** Last modification date of the dataset metadata, as an ISO 8601 date such as `2026-09-22`. */
  lastUpdated: string;
}

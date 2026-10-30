import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AnyLink } from '@atlasng/common';
import { TextLink } from '@atlasng/design-system/links/text-link';
import {
  SAMPLE_COMPACT_METADATA,
  SAMPLE_DATASET_AXES,
  SAMPLE_DATASETS,
  SAMPLE_HOVER_METADATA,
} from '../../datasets/sample-datasets';
/**
 * Landing page. Placeholder until the Figma homepage (hero, Space Time Organ Graph, EUI embed) is built.
 * Renders the `<mhu-cube>` custom element, which the app registers at startup, with the sample datasets.
 */
@Component({
  selector: 'mhu-home-page',
  imports: [AnyLink, TextLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HomePage {
  /** Axes for the Space Time Organ Graph. */
  protected readonly axes = SAMPLE_DATASET_AXES;
  /** Datasets plotted in the Space Time Organ Graph. */
  protected readonly datasets = SAMPLE_DATASETS;
  /** Metadata names shown on the graph's hover cards. */
  protected readonly hoverMetadata = SAMPLE_HOVER_METADATA;
  /** Metadata names shown on the compact dataset cards. */
  protected readonly compactMetadata = SAMPLE_COMPACT_METADATA;
}

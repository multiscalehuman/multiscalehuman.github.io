import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {
  SAMPLE_COMPACT_METADATA,
  SAMPLE_DATASET_AXES,
  SAMPLE_DATASETS,
  SAMPLE_HOVER_METADATA,
} from '../../datasets/sample-datasets';
import { Hero } from './hero/hero';

/**
 * Landing page: the hero, then the `<mhu-cube>` custom element, which the app registers at startup,
 * with the sample datasets. The rest of the Figma homepage (EUI embed) is still to come.
 */
@Component({
  selector: 'mhu-home-page',
  imports: [Hero],
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

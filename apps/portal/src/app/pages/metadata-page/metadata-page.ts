import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { AnyLinkCommand } from '@atlasng/common';
import { ContentBlock } from '@atlasng/content-blocks';
import { CONTENT_DOCUMENT_VERSION, ContentDocument } from '@atlasng/content-blocks/types';
import { Breadcrumbs } from '@atlasng/design-system/buttons/breadcrumbs';
import { ContentHeader } from '@atlasng/design-system/content/content-header';
import { ContentParagraph } from '@atlasng/design-system/content/content-paragraph';
import { ContentSection } from '@atlasng/design-system/content/content-section';
import { TableOfContents, TableOfContentsItem } from '@atlasng/design-system/table-of-contents';
import { ActiveSectionState } from './active-section-state';
import { DatasetMetadata, MetadataSection } from './dataset-metadata';

/** Trail from the CIFAR site to the portal homepage. */
const BASE_CRUMBS = [
  { name: 'Home', command: 'https://cifar.ca/' },
  { name: 'Research Programs', command: 'https://cifar.ca/research-programs/' },
  { name: 'CIFAR MacMillan Multiscale Human', command: 'https://cifar.ca/research-programs/' },
  { name: 'Data Portal', command: '/' },
];

/** Breadcrumb item */
export interface BreadcrumbItem {
  /** Name of item */
  name: string;
  /** Command to execute when the breadcrumb is clicked */
  command?: AnyLinkCommand;
}

/** Section with its body as a content document. */
interface RenderedSection extends MetadataSection {
  /** Section body as a content document for `ang-content-block`. */
  document: ContentDocument;
}

/**
 * Metadata page for one dataset, rendered from the {@link DatasetMetadata} passed as `metadata`.
 * The organ icon is a placeholder.
 */
@Component({
  selector: 'mhu-metadata-page',
  imports: [
    DatePipe,
    MatIcon,
    Breadcrumbs,
    ContentBlock,
    ContentHeader,
    ContentParagraph,
    ContentSection,
    TableOfContents,
  ],
  templateUrl: './metadata-page.html',
  styleUrl: './metadata-page.scss',
  providers: [ActiveSectionState],
})
export class MetadataPage {
  /** Dataset content to render. */
  readonly metadata = input.required<DatasetMetadata>();

  /** Trail from the CIFAR site to this page. */
  readonly crumbs = computed(() => {
    const { organ, space } = this.metadata();
    return [...BASE_CRUMBS, { name: `${organ}, ${space} Scale` }];
  });

  /** Dataset title, ordered Organ, Space, Time. */
  protected readonly title = computed(() => {
    const { organ, space, time } = this.metadata();
    return `${organ}, ${space}, ${time}`;
  });

  /** Sections with their body documents, in display order. */
  protected readonly sections = computed<RenderedSection[]>(() =>
    this.metadata().sections.map((section) => ({
      ...section,
      document: { version: CONTENT_DOCUMENT_VERSION, content: section.content },
    })),
  );

  /** Table of contents entries derived from the section headings, so each entry matches its heading. */
  protected readonly tocItems = computed<TableOfContentsItem[]>(() =>
    this.sections().map((section) => ({ tagline: section.title, level: 2, anchor: section.anchor })),
  );

  /** Tracks the section being read, updated on scroll and when a table of contents entry is clicked. */
  protected readonly activeSection = inject(ActiveSectionState);

  /** Table of contents entry highlighted for the active section. */
  protected readonly activeTocItem = computed(() =>
    this.tocItems().find((item) => item.anchor === this.activeSection.activeSectionAnchor()),
  );

  /** Keeps the active section service in sync with the rendered sections. */
  constructor() {
    effect(() => {
      const sections = this.sections();
      this.activeSection.initialize();
      this.activeSection.setSections(sections);
    });
  }
}

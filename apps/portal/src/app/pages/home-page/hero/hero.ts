import { IMAGE_CONFIG, IMAGE_LOADER, ImageLoaderConfig, NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { Breadcrumbs } from '@atlasng/design-system/buttons/breadcrumbs';

/** A crumb in the hero's breadcrumb trail. AtlasNG doesn't export its `BreadcrumbItem` type. */
interface BreadcrumbItem {
  name: string;
  command?: string;
}

/** Breadcrumb trail from cifar.ca down to the portal, which is the current page and has no link. */
const HERO_CRUMBS: BreadcrumbItem[] = [
  { name: 'Home', command: 'https://cifar.ca/' },
  { name: 'Research Programs', command: 'https://cifar.ca/research-programs/' },
  {
    name: 'CIFAR MacMillan Multiscale Human',
    command: 'https://cifar.ca/research-programs/cifar-macmillan-multiscale-human/',
  },
  { name: 'Data Portal' },
];

/**
 * Homepage hero: breadcrumbs, the CIFAR logo, the page title, and the tagline over the illustration.
 * The illustration scrolls at half the page's speed, except when the visitor prefers reduced motion.
 */
@Component({
  selector: 'mhu-hero',
  imports: [Breadcrumbs, NgOptimizedImage],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  providers: [
    {
      provide: IMAGE_CONFIG,
      useValue: {
        breakpoints: [640, 750, 828, 1080, 1200, 1920, 2048, 2880],
      },
    },
    {
      provide: IMAGE_LOADER,
      useValue: ({ src, width }: ImageLoaderConfig) => `${src}-${width ?? 2880}.webp`,
    },
  ],
})
export class Hero {
  /** Breadcrumb trail shown above the logo. */
  protected readonly crumbs = HERO_CRUMBS;

  /**
   * Rendered width of the illustration. `cover` renders it at the larger of the viewport width and
   * 2880 / 561 (about 5.13) times the hero's height. The hero is at least 25rem tall, or 20rem from 960px,
   * so the image is at least 128.4rem or 102.7rem wide. Keep these in sync with the minimum heights in hero.scss.
   */
  protected readonly sizes = '(min-width: 960px) max(100vw, 102.7rem), max(100vw, 128.4rem)';
}

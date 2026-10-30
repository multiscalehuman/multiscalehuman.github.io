import { IMAGE_LOADER, ImageLoaderConfig, NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { BreadcrumbItem, Breadcrumbs } from '@atlasng/design-system/buttons/breadcrumbs';

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
 * The illustration scrolls at 70% of the page's speed, except when the visitor prefers reduced motion or the browser
 * lacks CSS scroll-driven animations.
 */
@Component({
  selector: 'mhu-hero',
  imports: [Breadcrumbs, NgOptimizedImage],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  providers: [
    {
      provide: IMAGE_LOADER,
      useValue: ({ src, width }: ImageLoaderConfig) => `${src}-${width ?? 2880}.webp`,
    },
  ],
})
export class Hero {
  /** Breadcrumb trail shown above the logo. */
  protected readonly crumbs = HERO_CRUMBS;
}

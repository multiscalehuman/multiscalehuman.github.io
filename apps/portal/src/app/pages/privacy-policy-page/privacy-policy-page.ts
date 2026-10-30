import { Component } from '@angular/core';
import { AnyLink, AnyLinkCommand } from '@atlasng/common';
import { Breadcrumbs } from '@atlasng/design-system/buttons/breadcrumbs';
import { ContentHeader } from '@atlasng/design-system/content/content-header';
import { ContentParagraph } from '@atlasng/design-system/content/content-paragraph';
import { ContentSection } from '@atlasng/design-system/content/content-section';
import { TextLink } from '@atlasng/design-system/links/text-link';
import { TableOfContents, TableOfContentsItem } from '@atlasng/design-system/table-of-contents';

/** Breadcrumb trail item, in the shape {@link Breadcrumbs} accepts. */
interface BreadcrumbItem {
  /** Text shown for the crumb. */
  name: string;
  /** Link target. The current page's crumb has none. */
  command?: AnyLinkCommand;
}

/** Trail from the portal homepage to this page. */
const CRUMBS: BreadcrumbItem[] = [{ name: 'Home', command: '/' }, { name: 'Privacy Policy' }];

/**
 * Sections of the privacy policy, in page order. The template takes each section's title from here, so the
 * headings and the table of contents always match. Each anchor must match the section's `id` in the template.
 */
const SECTIONS = {
  overview: { tagline: 'Overview', level: 2, anchor: 'overview' },
  changes: { tagline: 'Changes', level: 2, anchor: 'changes' },
  collectionAndUse: { tagline: 'Collection and Use', level: 2, anchor: 'collection-and-use' },
  passiveAutomaticCollection: {
    tagline: 'Passive/Automatic Collection',
    level: 3,
    anchor: 'passive-automatic-collection',
  },
  activeManualVoluntaryCollection: {
    tagline: 'Active/Manual/Voluntary Collection',
    level: 3,
    anchor: 'active-manual-voluntary-collection',
  },
  informationUsage: { tagline: 'Information Usage', level: 3, anchor: 'information-usage' },
  informationSharing: { tagline: 'Information Sharing', level: 3, anchor: 'information-sharing' },
  cookies: { tagline: 'Cookies', level: 3, anchor: 'cookies' },
  children: { tagline: 'Children', level: 3, anchor: 'children' },
  thirdPartyServices: { tagline: 'Use of Third-Party Services', level: 3, anchor: 'third-party-services' },
  socialMedia: { tagline: 'Social Media', level: 3, anchor: 'social-media' },
  security: { tagline: 'Security', level: 2, anchor: 'security' },
  linksToNonUniversitySites: {
    tagline: 'Links to Non-University Sites',
    level: 2,
    anchor: 'links-to-non-university-sites',
  },
  privacyNoticeChanges: { tagline: 'Privacy Notice Changes', level: 2, anchor: 'privacy-notice-changes' },
  contactInformation: { tagline: 'Contact Information', level: 2, anchor: 'contact-information' },
} satisfies Record<string, TableOfContentsItem>;

/** Table of contents entries for the privacy policy sections, in page order. */
export const PRIVACY_POLICY_SECTIONS: TableOfContentsItem[] = Object.values(SECTIONS);

/**
 * Privacy policy page, laid out like the WPP portal's content pages: a header with breadcrumbs and the effective date,
 * the policy sections, and a table of contents that sits beside the sections on wide screens.
 */
@Component({
  selector: 'mhu-privacy-policy-page',
  imports: [AnyLink, Breadcrumbs, ContentHeader, ContentParagraph, ContentSection, TableOfContents, TextLink],
  templateUrl: './privacy-policy-page.html',
  styleUrl: './privacy-policy-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyPage {
  /** Breadcrumb trail shown above the title. */
  protected readonly crumbs = CRUMBS;

  /** Sections by name, for binding each section's title. */
  protected readonly sections = SECTIONS;

  /** Table of contents entries. */
  protected readonly tocItems = PRIVACY_POLICY_SECTIONS;
}

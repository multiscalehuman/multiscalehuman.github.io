import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AnyLink } from '@atlasng/common';
import { TextLink } from '@atlasng/design-system/links/text-link';

/** Landing page. Placeholder until the Figma homepage (hero, Space Time Organ Graph, EUI embed) is built. */
@Component({
  selector: 'mhu-home-page',
  imports: [AnyLink, TextLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}

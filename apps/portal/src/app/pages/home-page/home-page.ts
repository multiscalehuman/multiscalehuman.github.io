import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Landing page. Placeholder until the Figma homepage (hero, Space Time Organ Graph, EUI embed) is built. */
@Component({
  selector: 'mhu-home-page',
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}

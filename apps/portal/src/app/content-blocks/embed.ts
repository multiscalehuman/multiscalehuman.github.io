import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Embedded content block, such as a visualization. Placeholder that reserves space until embeds are available. */
@Component({
  selector: 'mhu-embed',
  template: '',
  styles: `
    :host {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      border-radius: var(--mat-sys-corner-small);
      background: var(--mat-sys-surface-container-high);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    '[attr.aria-label]': 'id()',
  },
})
export class Embed {
  /** Name of the embedded content, also its accessible name. */
  readonly id = input.required<string>();
}

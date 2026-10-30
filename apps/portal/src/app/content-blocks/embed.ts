import { Component, input } from '@angular/core';

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
  host: {
    role: 'img',
    '[attr.aria-label]': 'label()',
  },
})
export class Embed {
  /** Machine ID of the embedded content, such as `hra-organ-gallery`. */
  readonly id = input.required<string>();
  /** Human-readable description of the embedded content, used as its accessible name. */
  readonly label = input.required<string>();
}

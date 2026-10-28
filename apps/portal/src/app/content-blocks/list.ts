import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Bulleted list content block. Its content should be `ListItem` nodes. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- the host must be a native ul so ListItem hosts are valid children
  selector: 'ul[mhuList]',
  template: '<ng-content />',
  styles: `
    :host {
      margin: 0;
      padding-left: 1.5rem;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-large);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class List {}

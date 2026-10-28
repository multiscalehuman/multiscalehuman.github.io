import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Title of a cited work, such as a journal name, rendered in a `cite` element. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- the host is the native cite element
  selector: 'cite[mhuCite]',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cite {}

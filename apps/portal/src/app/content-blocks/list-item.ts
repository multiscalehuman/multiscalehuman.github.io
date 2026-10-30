import { Component } from '@angular/core';

/** List item content block, projected into a `List`. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- the host must be a native li to be a valid child of List
  selector: 'li[mhuListItem]',
  template: '<ng-content />',
})
export class ListItem {}

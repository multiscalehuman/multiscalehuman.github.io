import { Component, input } from '@angular/core';

/** Image content block, such as a screenshot of a visualization, shown at the full width of its section. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- the host is the native img element
  selector: 'img[mhuImage]',
  template: '',
  styles: `
    :host {
      display: block;
      width: 100%;
      height: auto;
    }
  `,
  host: {
    loading: 'lazy',
    decoding: 'async',
    '[src]': 'src()',
    '[alt]': 'alt()',
  },
})
export class ContentImage {
  /** Image URL, relative to the app's base URL, such as `assets/datasets/<id>-vr.png`. */
  readonly src = input.required<string>();
  /** Text alternative describing the image. */
  readonly alt = input.required<string>();
}

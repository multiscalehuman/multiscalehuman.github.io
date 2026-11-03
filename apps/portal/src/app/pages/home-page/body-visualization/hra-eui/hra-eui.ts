import { Component, CUSTOM_ELEMENTS_SCHEMA, DestroyRef, DOCUMENT, inject, input, Renderer2 } from '@angular/core';

/** ID of the EUI's `<script>` element, used to add the script only once. */
const EUI_SCRIPT_ID = 'ccf-eui-script';

/** ID of the EUI's stylesheet `<link>` element, shared by all instances. */
const EUI_STYLESHEET_ID = 'ccf-eui-stylesheet';

/** Number of EUI instances on the page, so the last one to go can remove the stylesheet. */
let euiCount = 0;

/** Organs the MHU datasets cover, as the UBERON IRIs the EUI uses for organ IDs: heart, both kidneys, liver, thymus, skin. */
export const MHU_ORGAN_IRIS: string[] = [
  'http://purl.obolibrary.org/obo/UBERON_0000948',
  'http://purl.obolibrary.org/obo/UBERON_0004538',
  'http://purl.obolibrary.org/obo/UBERON_0004539',
  'http://purl.obolibrary.org/obo/UBERON_0002107',
  'http://purl.obolibrary.org/obo/UBERON_0002370',
  'http://purl.obolibrary.org/obo/UBERON_0002097',
];

/**
 * The HRA Exploration User Interface (`<ccf-eui>`). The first instance adds the EUI's stylesheet and script from the
 * HRA CDN to the page. The stylesheet is global; the portal's `:root` theme tokens outrank the ones it sets on `html`,
 * so the EUI picks up the portal's colors and type. It also sets Material component tokens on `html`, which would
 * restyle the portal's own components, so the last instance removes it. The script stays, since it only defines the
 * custom element.
 * `baseHref` points the EUI's relative asset URLs at the CDN, since a `<base>` element would break the portal's routing.
 */
@Component({
  selector: 'mhu-hra-eui',
  templateUrl: './hra-eui.html',
  styleUrl: './hra-eui.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HraEui {
  /** URLs of the data sources the EUI queries. */
  readonly dataSources = input<string[]>([
    'https://hubmapconsortium.github.io/hra-registrations/cifar/rui_locations.jsonld',
  ]);

  /** Base URL for the EUI's relative asset URLs. */
  protected readonly baseHref = 'https://cdn.humanatlas.io/ui/ccf-eui/';
  /** Organs selected when the EUI starts. */
  protected readonly selectedOrgans = MHU_ORGAN_IRIS;

  protected readonly document = inject(DOCUMENT);
  protected readonly renderer = inject(Renderer2);

  /** Adds the EUI's stylesheet and script to the page, and removes the stylesheet with the last instance. */
  constructor() {
    this.addEuiAssets();
    euiCount++;

    inject(DestroyRef).onDestroy(() => {
      euiCount--;
      if (euiCount === 0) {
        this.removeEuiStylesheet();
      }
    });
  }

  /** Adds the EUI stylesheet and script if they are not already on the page. */
  protected addEuiAssets(): void {
    if (!this.document.getElementById(EUI_STYLESHEET_ID)) {
      const stylesheet = this.renderer.createElement('link');
      this.renderer.setAttribute(stylesheet, 'id', EUI_STYLESHEET_ID);
      this.renderer.setAttribute(stylesheet, 'rel', 'stylesheet');
      this.renderer.setAttribute(stylesheet, 'href', `${this.baseHref}styles.css`);
      this.renderer.appendChild(this.document.head, stylesheet);
    }

    if (!this.document.getElementById(EUI_SCRIPT_ID)) {
      const script = this.renderer.createElement('script');
      this.renderer.setAttribute(script, 'id', EUI_SCRIPT_ID);
      this.renderer.setAttribute(script, 'type', 'module');
      this.renderer.setAttribute(script, 'src', `${this.baseHref}wc.js`);
      this.renderer.appendChild(this.document.head, script);
    }
  }

  /** Removes the EUI stylesheet from the page, if present. */
  protected removeEuiStylesheet(): void {
    const stylesheet = this.document.getElementById(EUI_STYLESHEET_ID);
    if (stylesheet) {
      this.renderer.removeChild(this.document.head, stylesheet);
    }
  }
}

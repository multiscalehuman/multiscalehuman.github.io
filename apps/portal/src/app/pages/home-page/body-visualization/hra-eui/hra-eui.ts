import { Component, CUSTOM_ELEMENTS_SCHEMA, DOCUMENT, inject, input, Renderer2 } from '@angular/core';

/** ID of the EUI's `<script>` element, used to add the stylesheet and script only once. */
const EUI_SCRIPT_ID = 'ccf-eui-script';

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
 * so the EUI picks up the portal's colors and type.
 * `baseHref` points the EUI's relative asset URLs at the CDN, since a `<base>` element would break the portal's routing.
 */
@Component({
  selector: 'mhu-hra-eui',
  templateUrl: './hra-eui.html',
  styleUrl: './hra-eui.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HraEui {
  /** URLs of the data sources the EUI queries. When unset, the EUI uses the default HRA API data. */
  readonly dataSources = input<string[]>();

  /** Base URL for the EUI's relative asset URLs. */
  protected readonly baseHref = 'https://cdn.humanatlas.io/ui/ccf-eui/';
  /** Organs selected when the EUI starts. */
  protected readonly selectedOrgans = MHU_ORGAN_IRIS;

  protected readonly document = inject(DOCUMENT);
  protected readonly renderer = inject(Renderer2);

  /** Adds the EUI's stylesheet and script to the page the first time the EUI is shown. */
  constructor() {
    this.addEuiAssets();
  }

  /** Adds the EUI stylesheet and script if they have not already been added. */
  protected addEuiAssets(): void {
    if (!this.document.getElementById(EUI_SCRIPT_ID)) {
      const stylesheet = this.renderer.createElement('link');
      this.renderer.setAttribute(stylesheet, 'rel', 'stylesheet');
      this.renderer.setAttribute(stylesheet, 'href', `${this.baseHref}styles.css`);
      this.renderer.appendChild(this.document.head, stylesheet);

      const script = this.renderer.createElement('script');
      this.renderer.setAttribute(script, 'id', EUI_SCRIPT_ID);
      this.renderer.setAttribute(script, 'type', 'module');
      this.renderer.setAttribute(script, 'src', `${this.baseHref}wc.js`);
      this.renderer.appendChild(this.document.head, script);
    }
  }
}

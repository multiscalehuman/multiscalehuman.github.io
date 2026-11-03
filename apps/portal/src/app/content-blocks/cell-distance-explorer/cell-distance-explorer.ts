import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  DOCUMENT,
  inject,
  input,
  Renderer2,
} from '@angular/core';
import { Notice } from '@atlasng/design-system/indicators/notice';

/** ID of the CDE's `<script>` element, used to add the script only once. */
const CDE_SCRIPT_ID = 'cde-visualization-script';

/** ID of the CDE's stylesheet `<link>` element, shared by all instances. */
const CDE_STYLESHEET_ID = 'cde-visualization-stylesheet';

/** Base URL of the CDE web component's stylesheet and script on the HRA CDN. */
const CDE_CDN_URL = 'https://cdn.humanatlas.io/ui/cde-visualization-wc/';

/** Number of CDE content blocks on the page, so the last one to go can remove the stylesheet. */
let cdeCount = 0;

/**
 * Cell Distance Explorer content block: the HRA CDE web component (`<cde-visualization>`) showing how cell types are
 * distributed around an anchor cell type. The first instance adds the CDE's stylesheet and script from the HRA CDN to
 * the page. The component loads once it scrolls into view, so the nodes CSV is only fetched when needed.
 * The stylesheet is global: it sets the HRA light theme on every `.hra-app`, including the EUI's root, and defines the
 * CDE's fonts, such as the Metropolis face its canvas charts use. So the last instance removes it, and the EUI keeps
 * the portal theme after the CDE pages. The script stays, since it only defines the custom element.
 * Below 1400px, a notice recommends a larger screen. The CDE's Sample Metadata panel is hidden, since the metadata page
 * header already describes the dataset.
 */
@Component({
  selector: 'mhu-cell-distance-explorer',
  imports: [Notice],
  templateUrl: './cell-distance-explorer.html',
  styleUrl: './cell-distance-explorer.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CellDistanceExplorer {
  /** URL of the nodes CSV, relative to the app's base URL, such as `assets/datasets/<id>-cde.csv`. */
  readonly nodes = input.required<string>();
  /** Cell type the distances are measured from. The CDE matches this exact `Cell Type` label. */
  readonly nodeTargetSelector = input.required<string>();

  protected readonly document = inject(DOCUMENT);
  protected readonly renderer = inject(Renderer2);

  /** Absolute nodes URL, so the CDE fetches it from the app's base URL regardless of the current route. */
  protected readonly nodesUrl = computed(() => new URL(this.nodes(), this.document.baseURI).href);

  /** Adds the CDE's stylesheet and script to the page, and removes the stylesheet with the last instance. */
  constructor() {
    this.addCdeAssets();
    cdeCount++;

    inject(DestroyRef).onDestroy(() => {
      cdeCount--;
      if (cdeCount === 0) {
        this.removeCdeStylesheet();
      }
    });
  }

  /** Adds the CDE stylesheet and script if they are not already on the page. */
  protected addCdeAssets(): void {
    if (!this.document.getElementById(CDE_STYLESHEET_ID)) {
      const stylesheet = this.renderer.createElement('link');
      this.renderer.setAttribute(stylesheet, 'id', CDE_STYLESHEET_ID);
      this.renderer.setAttribute(stylesheet, 'rel', 'stylesheet');
      this.renderer.setAttribute(stylesheet, 'href', `${CDE_CDN_URL}styles.css`);
      this.renderer.appendChild(this.document.head, stylesheet);
    }

    if (!this.document.getElementById(CDE_SCRIPT_ID)) {
      const script = this.renderer.createElement('script');
      this.renderer.setAttribute(script, 'id', CDE_SCRIPT_ID);
      this.renderer.setAttribute(script, 'type', 'module');
      this.renderer.setAttribute(script, 'src', `${CDE_CDN_URL}wc.js`);
      this.renderer.appendChild(this.document.head, script);
    }
  }

  /** Removes the CDE stylesheet from the page, if present. */
  protected removeCdeStylesheet(): void {
    const stylesheet = this.document.getElementById(CDE_STYLESHEET_ID);
    if (stylesheet) {
      this.renderer.removeChild(this.document.head, stylesheet);
    }
  }
}

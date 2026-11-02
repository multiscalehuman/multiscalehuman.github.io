import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, DOCUMENT, inject, input, Renderer2 } from '@angular/core';

/** ID of the CDE's `<script>` element, used to add the stylesheet and script only once. */
const CDE_SCRIPT_ID = 'cde-visualization-script';

/** Base URL of the CDE web component's stylesheet and script on the HRA CDN. */
const CDE_CDN_URL = 'https://cdn.humanatlas.io/ui/cde-visualization-wc/';

/**
 * Cell Distance Explorer content block: the HRA CDE web component (`<cde-visualization>`) showing how cell types are
 * distributed around an anchor cell type. The first instance adds the CDE's stylesheet and script from the HRA CDN to
 * the page. The component loads once it scrolls into view, so the nodes CSV is only fetched when needed.
 * The stylesheet is global: it sets the HRA theme on `.hra-app` and defines the CDE's fonts, such as the Metropolis
 * face its canvas charts use.
 */
@Component({
  selector: 'mhu-cell-distance-explorer',
  templateUrl: './cell-distance-explorer.html',
  styleUrl: './cell-distance-explorer.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CellDistanceExplorer {
  /** URL of the nodes CSV, relative to the app's base URL, such as `assets/datasets/<id>-cde.csv`. */
  readonly nodes = input.required<string>();
  /** Cell type the distances are measured from. The CDE matches this exact `Cell Type` label. */
  readonly nodeTargetSelector = input.required<string>();
  /** Dataset title shown in the CDE's metadata panel. */
  readonly title = input<string>();
  /** Dataset organ shown in the CDE's metadata panel. */
  readonly organ = input<string>();
  /** Dataset imaging technology shown in the CDE's metadata panel. */
  readonly technology = input<string>();

  protected readonly document = inject(DOCUMENT);
  protected readonly renderer = inject(Renderer2);

  /** Absolute nodes URL, so the CDE fetches it from the app's base URL regardless of the current route. */
  protected readonly nodesUrl = computed(() => new URL(this.nodes(), this.document.baseURI).href);

  /**
   * Dataset metadata for the CDE. Passed as one object rather than separate inputs, since a `title` property binding
   * would also set the native `title` tooltip.
   */
  protected readonly metadata = computed(() => ({
    title: this.title(),
    organ: this.organ(),
    technology: this.technology(),
  }));

  /** Adds the CDE's stylesheet and script to the page the first time the CDE is shown. */
  constructor() {
    this.addCdeAssets();
  }

  /** Adds the CDE stylesheet and script if they have not already been added. */
  protected addCdeAssets(): void {
    if (!this.document.getElementById(CDE_SCRIPT_ID)) {
      const stylesheet = this.renderer.createElement('link');
      this.renderer.setAttribute(stylesheet, 'rel', 'stylesheet');
      this.renderer.setAttribute(stylesheet, 'href', `${CDE_CDN_URL}styles.css`);
      this.renderer.appendChild(this.document.head, stylesheet);

      const script = this.renderer.createElement('script');
      this.renderer.setAttribute(script, 'id', CDE_SCRIPT_ID);
      this.renderer.setAttribute(script, 'type', 'module');
      this.renderer.setAttribute(script, 'src', `${CDE_CDN_URL}wc.js`);
      this.renderer.appendChild(this.document.head, script);
    }
  }
}

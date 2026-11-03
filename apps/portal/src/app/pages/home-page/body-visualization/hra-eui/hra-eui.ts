import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  input,
  Renderer2,
} from '@angular/core';
import { AnalyticsEventCategory } from '@atlasng/analytics/events';
import { AnalyticsPermissionsManager } from '@atlasng/analytics/permissions';

/** ID of the EUI's `<script>` element, used to add the script only once. */
const EUI_SCRIPT_ID = 'ccf-eui-script';

/** ID of the EUI's stylesheet `<link>` element, shared by all instances. */
const EUI_STYLESHEET_ID = 'ccf-eui-stylesheet';

/** HRA privacy preferences that allow only necessary analytics, saved so the EUI skips its own consent banner. */
const HRA_NECESSARY_ONLY_PREFERENCES = { necessary: true, statistics: false, preferences: false, marketing: false };

/** localStorage key where the EUI keeps the visitor's HRA privacy preferences. */
const HRA_PRIVACY_PREFERENCES_KEY = '__hra-analytics-privacy-preferences';

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
 * Loads the HRA EUI assets from the CDN and syncs its cookie preferences with the portal. The global stylesheet is
 * removed on destroy because it sets Material tokens on `html`; the script stays to keep `<ccf-eui>` registered.
 * `baseHref` resolves relative asset URLs without changing portal routing.
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

  /** The `document` object, used to add the EUI's stylesheet and script to the page. */
  protected readonly document = inject(DOCUMENT);
  /** The `Renderer2` service, used to add and remove the EUI's stylesheet. */
  protected readonly renderer = inject(Renderer2);
  /** The visitor's cookie and analytics permissions from the portal's cookie banner. */
  protected readonly permissionsManager = inject(AnalyticsPermissionsManager);

  /** A computed property that returns the visitor's analytics preferences. */
  protected readonly analytics = computed(() => {
    const permissions = this.permissionsManager.permissions();
    return Object.fromEntries(
      Object.values(AnalyticsEventCategory).map((category) => [category, permissions.isCategoryEnabled(category)]),
    );
  });

  /**
   * Keeps the HRA privacy preferences in sync with the portal's permissions, adds the EUI's stylesheet and script to
   * the page, and removes the stylesheet when the EUI is removed.
   */
  constructor() {
    effect(() => {
      this.saveHraPrivacyPreferences();
    });
    this.addEuiAssets();

    inject(DestroyRef).onDestroy(() => {
      this.removeEuiStylesheet();
    });
  }

  /**
   * Saves the portal's analytics permissions as the HRA privacy preferences, so the EUI skips its consent banner and
   * respects the visitor's choices. If saving fails, saves preferences that allow only necessary analytics, so the EUI still skips its banner.
   */
  protected saveHraPrivacyPreferences(): void {
    try {
      this.document.defaultView?.localStorage.setItem(HRA_PRIVACY_PREFERENCES_KEY, JSON.stringify(this.analytics()));
    } catch {
      try {
        this.document.defaultView?.localStorage.setItem(
          HRA_PRIVACY_PREFERENCES_KEY,
          JSON.stringify(HRA_NECESSARY_ONLY_PREFERENCES),
        );
      } catch (error) {
        console.warn('Unable to save HRA privacy preferences.', error);
      }
    }
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

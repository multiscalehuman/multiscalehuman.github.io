import { signal } from '@angular/core';
import { DeferBlockState } from '@angular/core/testing';
import { AnalyticsPermissions, AnalyticsPermissionsManager } from '@atlasng/analytics/permissions';
import { render, screen } from '@testing-library/angular';
import { HraEui, MHU_ORGAN_IRIS } from './hra-eui';

const EUI_CDN_URL = 'https://cdn.humanatlas.io/ui/ccf-eui/';

type EuiElement = HTMLElement & Record<string, unknown>;

async function renderEui(inputs: Record<string, unknown> = {}) {
  const { container } = await render(HraEui, { inputs, deferBlockStates: DeferBlockState.Complete });
  return container.querySelector('ccf-eui') as EuiElement;
}

function euiTags() {
  return {
    stylesheets: document.head.querySelectorAll(`link[href="${EUI_CDN_URL}styles.css"]`),
    scripts: document.head.querySelectorAll(`script[src="${EUI_CDN_URL}wc.js"]`),
  };
}

describe('HraEui', () => {
  afterEach(() => {
    const { stylesheets, scripts } = euiTags();
    [...stylesheets, ...scripts].forEach((tag) => tag.remove());
  });

  it('adds the EUI stylesheet and module script once', async () => {
    await render('<mhu-hra-eui /><mhu-hra-eui />', { imports: [HraEui] });
    const { stylesheets, scripts } = euiTags();

    expect(stylesheets).toHaveLength(1);
    expect(stylesheets[0]).toHaveAttribute('rel', 'stylesheet');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute('type', 'module');
  });

  it('removes the EUI stylesheet with the EUI, keeping the script', async () => {
    const { fixture } = await render(HraEui);
    expect(euiTags().stylesheets).toHaveLength(1);

    fixture.destroy();
    expect(euiTags().stylesheets).toHaveLength(0);
    expect(euiTags().scripts).toHaveLength(1);
  });

  describe('HRA privacy preferences', () => {
    const key = '__hra-analytics-privacy-preferences';

    function renderWithPermissions(permissions: AnalyticsPermissions) {
      const permissionsSignal = signal(permissions);
      const providers = [{ provide: AnalyticsPermissionsManager, useValue: { permissions: permissionsSignal } }];
      return { permissionsSignal, result: render(HraEui, { providers }) };
    }

    function savedPreferences() {
      return JSON.parse(localStorage.getItem(key) ?? 'null');
    }

    afterEach(() => {
      localStorage.removeItem(key);
      vi.restoreAllMocks();
    });

    it("saves the visitor's portal permissions so the EUI skips its consent banner", async () => {
      await renderWithPermissions(AnalyticsPermissions.DEFAULT).result;

      expect(savedPreferences()).toEqual({ necessary: true, statistics: false, preferences: false, marketing: false });
    });

    it('updates the saved preferences when the visitor changes their permissions', async () => {
      const { permissionsSignal, result } = renderWithPermissions(AnalyticsPermissions.DEFAULT);
      const { fixture } = await result;

      permissionsSignal.set(AnalyticsPermissions.FULL);
      fixture.detectChanges();

      expect(savedPreferences()).toEqual({ necessary: true, statistics: true, preferences: true, marketing: true });
    });

    it('still renders when storage is blocked', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      await renderWithPermissions(AnalyticsPermissions.DEFAULT).result;

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('shows a loading placeholder until the EUI scrolls into view', async () => {
    const { container } = await render(HraEui);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(container.querySelector('ccf-eui')).not.toBeInTheDocument();
  });

  it('renders the EUI with the MHU organs, login disabled, and assets from the CDN', async () => {
    const eui = await renderEui();

    expect(eui).toBeInTheDocument();
    expect(eui['baseHref']).toBe(EUI_CDN_URL);
    expect(eui['selectedOrgans']).toEqual(MHU_ORGAN_IRIS);
    expect(eui['loginDisabled']).toBe(true);
    expect(eui['disableScreenSizeNotice']).toBe(true);
  });

  it('defaults the data sources to the CIFAR registrations', async () => {
    const eui = await renderEui();

    expect(eui['dataSources']).toEqual([
      'https://hubmapconsortium.github.io/hra-registrations/cifar/rui_locations.jsonld',
    ]);
  });

  it('passes the data sources to the EUI', async () => {
    const dataSources = ['https://example.org/mhu-data.jsonld'];
    const eui = await renderEui({ dataSources });

    expect(eui['dataSources']).toEqual(dataSources);
  });
});

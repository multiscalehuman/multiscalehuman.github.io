import { render } from '@testing-library/angular';
import { HraEui, MHU_ORGAN_IRIS } from './hra-eui';

const EUI_CDN_URL = 'https://cdn.humanatlas.io/ui/ccf-eui/';

type EuiElement = HTMLElement & Record<string, unknown>;

async function renderEui(inputs: Record<string, unknown> = {}) {
  const { container } = await render(HraEui, { inputs });
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

  it('renders the EUI with the MHU organs, login disabled, and assets from the CDN', async () => {
    const eui = await renderEui();

    expect(eui).toBeInTheDocument();
    expect(eui['baseHref']).toBe(EUI_CDN_URL);
    expect(eui['selectedOrgans']).toEqual(MHU_ORGAN_IRIS);
    expect(eui['loginDisabled']).toBe(true);
    expect(eui['disableScreenSizeNotice']).toBe(true);
  });

  it('leaves the data sources unset by default', async () => {
    const eui = await renderEui();

    expect(eui['dataSources']).toBeUndefined();
  });

  it('passes the data sources to the EUI', async () => {
    const dataSources = ['https://example.org/mhu-data.jsonld'];
    const eui = await renderEui({ dataSources });

    expect(eui['dataSources']).toEqual(dataSources);
  });
});

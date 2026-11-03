import { DeferBlockState } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { CellDistanceExplorer } from './cell-distance-explorer';

const CDE_CDN_URL = 'https://cdn.humanatlas.io/ui/cde-visualization-wc/';

const INPUTS = { nodes: 'assets/datasets/lung-cde.csv', nodeTargetSelector: 'Endothelial cells' };

type CdeElement = HTMLElement & Record<string, unknown>;

async function renderCde(inputs: Record<string, unknown> = INPUTS) {
  const { container } = await render(CellDistanceExplorer, { inputs, deferBlockStates: DeferBlockState.Complete });
  return container.querySelector('cde-visualization') as CdeElement;
}

function cdeTags() {
  return {
    stylesheets: document.head.querySelectorAll(`link[href="${CDE_CDN_URL}styles.css"]`),
    scripts: document.head.querySelectorAll(`script[src="${CDE_CDN_URL}wc.js"]`),
  };
}

describe('CellDistanceExplorer', () => {
  afterEach(() => {
    const { stylesheets, scripts } = cdeTags();
    [...stylesheets, ...scripts].forEach((tag) => tag.remove());
  });

  it('adds the CDE stylesheet and module script once', async () => {
    await render(
      `<mhu-cell-distance-explorer nodes="a.csv" nodeTargetSelector="A" />
       <mhu-cell-distance-explorer nodes="b.csv" nodeTargetSelector="B" />`,
      { imports: [CellDistanceExplorer] },
    );
    const { stylesheets, scripts } = cdeTags();

    expect(stylesheets).toHaveLength(1);
    expect(stylesheets[0]).toHaveAttribute('rel', 'stylesheet');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute('type', 'module');
  });

  it('removes the CDE stylesheet with the last CDE, keeping the script', async () => {
    const { fixture, rerender } = await render(
      `<mhu-cell-distance-explorer nodes="a.csv" nodeTargetSelector="A" />
       @if (showSecond) {
         <mhu-cell-distance-explorer nodes="b.csv" nodeTargetSelector="B" />
       }`,
      { imports: [CellDistanceExplorer], componentProperties: { showSecond: true } },
    );

    await rerender({ componentProperties: { showSecond: false } });
    expect(cdeTags().stylesheets).toHaveLength(1);

    fixture.destroy();
    expect(cdeTags().stylesheets).toHaveLength(0);
    expect(cdeTags().scripts).toHaveLength(1);
  });

  it('renders the screen size notice', async () => {
    await render(CellDistanceExplorer, { inputs: INPUTS });

    expect(screen.getByRole('note')).toHaveTextContent('Larger screen recommended');
    expect(screen.getByRole('note')).toHaveTextContent(
      'For the best experience, use a desktop browser window at least 1400px wide.',
    );
  });

  it('shows a loading placeholder until the CDE scrolls into view', async () => {
    const { container } = await render(CellDistanceExplorer, { inputs: INPUTS });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(container.querySelector('cde-visualization')).not.toBeInTheDocument();
  });

  it('passes the nodes as an absolute URL and the anchor cell type', async () => {
    const cde = await renderCde();

    expect(cde['nodes']).toBe(new URL('assets/datasets/lung-cde.csv', document.baseURI).href);
    expect(cde['nodeTargetSelector']).toBe('Endothelial cells');
  });
});

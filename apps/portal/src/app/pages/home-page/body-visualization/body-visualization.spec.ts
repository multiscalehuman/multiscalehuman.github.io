import { DeferBlockState } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { BodyVisualization } from './body-visualization';

describe('BodyVisualization', () => {
  it('renders the intro', async () => {
    await render(BodyVisualization);

    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '3D Human Body Visualization' })).toBeInTheDocument();
    expect(screen.getByText('View data in the 3D Human Reference Atlas.')).toBeInTheDocument();
  });

  it('renders the screen size notice', async () => {
    await render(BodyVisualization);

    expect(screen.getByRole('note')).toHaveTextContent('Larger screen recommended');
    expect(screen.getByRole('note')).toHaveTextContent(
      'For the best experience, use a desktop browser window at least 1400px wide.',
    );
  });

  it('renders the EUI', async () => {
    const { container } = await render(BodyVisualization, { deferBlockStates: DeferBlockState.Complete });

    expect(container.querySelector('ccf-eui')).toBeInTheDocument();
  });
});

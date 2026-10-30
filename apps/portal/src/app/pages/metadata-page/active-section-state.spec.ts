import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, effect, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ActiveSectionState } from './active-section-state';

@Component({
  template: `
    <a href="#three">Jump to three</a>
    @for (section of sections; track section.anchor) {
      <h2 [id]="section.anchor">{{ section.anchor }}</h2>
    }
  `,
  providers: [ActiveSectionState],
})
class TestHost {
  readonly sections = [{ anchor: 'one' }, { anchor: 'two' }, { anchor: 'three' }];
  readonly activeSection = inject(ActiveSectionState);

  constructor() {
    effect(() => {
      this.activeSection.initialize();
      this.activeSection.setSections(this.sections);
    });
  }
}

describe('ActiveSectionState', () => {
  async function setup(): Promise<ActiveSectionState> {
    const { fixture } = await render(TestHost, { providers: [provideLocationMocks()] });
    layout({ one: 0, two: 900, three: 1500 });
    await nextFrame();
    return fixture.componentInstance.activeSection;
  }

  function nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function layout(tops: Record<string, number>, scrollY = 1000): void {
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('scrollY', scrollY);
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 5000 });
    for (const [anchor, top] of Object.entries(tops)) {
      vi.spyOn(screen.getByRole('heading', { name: anchor }), 'getBoundingClientRect').mockReturnValue({
        top,
      } as DOMRect);
    }
  }

  async function scroll(): Promise<void> {
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('activates the first section by default', async () => {
    const state = await setup();
    layout({ one: 300, two: 900, three: 1500 });
    await scroll();

    expect(state.activeSectionAnchor()).toBe('one');
    expect(state.isSectionActive('one')).toBe(true);
  });

  it('activates the last section whose heading passed the activation line', async () => {
    const state = await setup();
    layout({ one: -500, two: 50, three: 700 });
    await scroll();

    expect(state.activeSectionAnchor()).toBe('two');
    expect(state.isSectionActive('one')).toBe(false);
  });

  it('activates the last section at the bottom of the page', async () => {
    const state = await setup();
    layout({ one: -500, two: 300, three: 600 }, 4200);
    await scroll();

    expect(state.activeSectionAnchor()).toBe('three');
  });

  it('keeps a selected section active while scrolling to it', async () => {
    const state = await setup();
    state.selectSection('three');
    layout({ one: -500, two: 50, three: 400 });
    await scroll();

    expect(state.activeSectionAnchor()).toBe('three');
  });

  it('follows scrolling again once the selected section is reached', async () => {
    const state = await setup();
    state.selectSection('three');
    layout({ one: -1500, two: -600, three: 20 });
    await scroll();
    layout({ one: -500, two: 50, three: 700 });
    await scroll();

    expect(state.activeSectionAnchor()).toBe('two');
  });

  it('follows scrolling again after the selection expires', async () => {
    const state = await setup();
    state.selectSection('three');
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000);
    layout({ one: -500, two: 50, three: 700 });
    await scroll();

    expect(state.activeSectionAnchor()).toBe('two');
  });

  it('scrolls to sections linked with local anchors and updates the URL fragment', async () => {
    const state = await setup();
    const heading = screen.getByRole('heading', { name: 'three' });
    heading.scrollIntoView = vi.fn();

    await userEvent.click(screen.getByRole('link', { name: 'Jump to three' }));

    expect(heading.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(state.activeSectionAnchor()).toBe('three');
    expect(TestBed.inject(Location).path(true)).toBe('/#three');
  });
});

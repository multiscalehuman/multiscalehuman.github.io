import { DOCUMENT, Location } from '@angular/common';
import { computed, DestroyRef, ElementRef, inject, Service, signal } from '@angular/core';

/** Page section tracked by {@link ActiveSectionState }. */
export interface ActiveSection {
  /** ID of the section's heading element, also used as its URL fragment. */
  anchor: string;
}

/**
 * Tracks which section of a page the reader is viewing, for highlighting table of contents entries.
 *
 * Provide it in the page component, call {@link initialize} and {@link setSections} from an effect, and read
 * {@link activeSectionAnchor}. The active section is the last one whose heading has scrolled past a line near
 * the top of the viewport, or the last section once the page is scrolled to the bottom. The first section is
 * active by default.
 *
 * A section chosen with {@link selectSection}, or through a local `#anchor` link inside the page, stays active
 * while the page scrolls to it, so the sections passed along the way are not highlighted.
 */
@Service({ autoProvided: false })
export class ActiveSectionState {
  /** Distance in pixels from the top of the viewport that a heading must pass to become active. */
  readonly #activeSectionOffset = 96;

  /** Milliseconds a chosen section stays active while the page scrolls to it. */
  readonly #pendingActiveSectionDuration = 1200;

  /** Destroy ref of the providing component, used to remove listeners. */
  readonly #destroyRef = inject(DestroyRef);

  /** Document hosting the page. */
  readonly #document = inject(DOCUMENT);

  /** Host element of the providing component. Local anchor clicks inside it are handled. */
  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Location service used to update the URL fragment without a router navigation. */
  readonly #location = inject(Location);

  /** Sections in document order. */
  readonly #sections = signal<readonly ActiveSection[]>([]);

  /** Anchor of the section chosen by scrolling or selection. */
  readonly #selectedSectionAnchor = signal<string | undefined>(undefined);

  /** Whether listeners have been added. */
  #initialized = false;

  /** Section chosen by the reader that stays active while the page scrolls to it. */
  #pendingActiveSectionAnchor: string | undefined;

  /** Time, from `Date.now()`, after which the pending section no longer overrides scrolling. */
  #pendingActiveSectionExpiresAt = 0;

  /** Anchor of the active section, or `undefined` when there are no sections. */
  readonly activeSectionAnchor = computed(() => {
    const sections = this.#sections();
    const selectedAnchor = this.#selectedSectionAnchor();
    if (selectedAnchor && sections.some((section) => section.anchor === selectedAnchor)) {
      return selectedAnchor;
    }
    return sections[0]?.anchor;
  });

  /**
   * Starts tracking scroll and resize events and local anchor clicks in the host element.
   * Safe to call repeatedly; later calls only resync the active section.
   */
  initialize(): void {
    if (this.#initialized) {
      this.#syncActiveSectionOnNextFrame();
      return;
    }
    this.#initialized = true;

    const host = this.#elementRef.nativeElement;
    const view = this.#document.defaultView;
    view?.addEventListener('scroll', this.#syncActiveSectionWithScroll, { passive: true });
    view?.addEventListener('resize', this.#syncActiveSectionWithScroll, { passive: true });
    host.addEventListener('click', this.#scrollToLocalAnchor);

    this.#destroyRef.onDestroy(() => {
      view?.removeEventListener('scroll', this.#syncActiveSectionWithScroll);
      view?.removeEventListener('resize', this.#syncActiveSectionWithScroll);
      host.removeEventListener('click', this.#scrollToLocalAnchor);
    });

    this.#syncActiveSectionOnNextFrame();
  }

  /**
   * Replaces the tracked sections. Keeps the current selection when it is still one of them.
   * @param sections Sections in document order
   */
  setSections(sections: readonly ActiveSection[]): void {
    this.#sections.set(sections);

    const selectedAnchor = this.#selectedSectionAnchor();
    if (!selectedAnchor || !sections.some((section) => section.anchor === selectedAnchor)) {
      this.#selectedSectionAnchor.set(sections[0]?.anchor);
    }

    this.#syncActiveSectionOnNextFrame();
  }

  /**
   * Makes a section active and keeps it active while the page scrolls to it, for example after a table of
   * contents click. Scrolling there is left to the caller.
   * @param anchor Anchor of the chosen section
   */
  selectSection(anchor: string): void {
    this.#selectedSectionAnchor.set(anchor);
    this.#pendingActiveSectionAnchor = anchor;
    this.#pendingActiveSectionExpiresAt = Date.now() + this.#pendingActiveSectionDuration;
  }

  /**
   * Checks whether a section is the active one.
   * @param anchor Section anchor
   * @returns Whether the section is active
   */
  isSectionActive(anchor: string): boolean {
    return this.activeSectionAnchor() === anchor;
  }

  /**
   * Scrolls to sections linked with local `#anchor` links in the host, which would otherwise resolve
   * against the document base URL and leave the page. Modified clicks keep the browser behavior.
   * @param event Click event from the host element
   */
  readonly #scrollToLocalAnchor = (event: MouseEvent): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const href = target.closest<HTMLAnchorElement>('a[href^="#"]')?.getAttribute('href');
    const anchor = href ? this.#getAnchorFromHref(href) : undefined;
    const section = anchor ? this.#document.getElementById(anchor) : null;
    if (!anchor || !section) {
      return;
    }

    event.preventDefault();
    this.selectSection(anchor);
    this.#location.go(`${this.#location.path().split('#')[0]}#${encodeURIComponent(anchor)}`);
    const prefersReducedMotion = this.#document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  /** Updates the active section from the scroll position, unless a chosen section is still being scrolled to. */
  readonly #syncActiveSectionWithScroll = (): void => {
    if (this.#shouldKeepPendingSectionActive()) {
      return;
    }

    this.#pendingActiveSectionAnchor = undefined;
    const activeAnchor = this.#getActiveSectionAnchorFromScroll();
    if (activeAnchor) {
      this.#selectedSectionAnchor.set(activeAnchor);
    }
  };

  /**
   * Finds the section matching the scroll position.
   * @returns Anchor of the last section whose heading passed the activation line, the last section at the
   * bottom of the page, or `undefined` when there are no sections
   */
  #getActiveSectionAnchorFromScroll(): string | undefined {
    const sections = this.#sections();
    if (sections.length === 0) {
      return undefined;
    }
    if (this.#isScrolledToBottom()) {
      return sections[sections.length - 1].anchor;
    }

    let activeAnchor = sections[0].anchor;
    for (const section of sections) {
      const element = this.#document.getElementById(section.anchor);
      if (!element) {
        continue;
      }
      if (element.getBoundingClientRect().top > this.#activeSectionOffset) {
        break;
      }
      activeAnchor = section.anchor;
    }
    return activeAnchor;
  }

  /**
   * Checks whether a chosen section should stay active: it has not expired and its heading has not yet
   * reached the area between the top of the viewport and the activation line.
   * @returns Whether to ignore the scroll position
   */
  #shouldKeepPendingSectionActive(): boolean {
    if (!this.#pendingActiveSectionAnchor || Date.now() > this.#pendingActiveSectionExpiresAt) {
      return false;
    }

    const element = this.#document.getElementById(this.#pendingActiveSectionAnchor);
    if (!element) {
      return false;
    }

    const top = element.getBoundingClientRect().top;
    return top < 0 || top > this.#activeSectionOffset;
  }

  /**
   * Checks whether the window is scrolled to the bottom of the page.
   * @returns Whether no further scrolling down is possible
   */
  #isScrolledToBottom(): boolean {
    const view = this.#document.defaultView;
    if (!view) {
      return false;
    }
    return Math.ceil(view.scrollY + view.innerHeight) >= this.#document.documentElement.scrollHeight - 1;
  }

  /**
   * Extracts the anchor from a local link.
   * @param href Link `href` starting with `#`
   * @returns Decoded anchor, or `undefined` for a bare `#`
   */
  #getAnchorFromHref(href: string): string | undefined {
    const anchor = href.slice(1);
    if (!anchor) {
      return undefined;
    }
    try {
      return decodeURIComponent(anchor);
    } catch {
      return anchor;
    }
  }

  /** Syncs the active section after the next layout, once headings are rendered. */
  #syncActiveSectionOnNextFrame(): void {
    this.#document.defaultView?.requestAnimationFrame(() => this.#syncActiveSectionWithScroll());
  }
}

const FADE_OUT_DURATION = 90;
const FADE_IN_DURATION = 140;

/** Coordinates a short, cancellable fade between desktop detail-card states. */
export class DetailsTransition {
  #animation: Animation | null = null;
  #version = 0;

  /**
   * Cancels any active transition and prevents its deferred update from running.
   * @returns Nothing.
   */
  cancel() {
    this.#version += 1;
    this.#animation?.cancel();
    this.#animation = null;
  }

  /**
   * Fades out a detail card, updates its content, and fades the updated card in.
   * @param details - Stable detail-card element being updated.
   * @param updateContent - Callback that replaces the card content at minimum opacity.
   * @returns Nothing.
   */
  run(details: HTMLElement, updateContent: () => void) {
    this.cancel();
    const transitionVersion = this.#version;
    const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || typeof details.animate !== "function") {
      updateContent();
      return;
    }

    const fadeOut = details.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: FADE_OUT_DURATION, easing: "ease-out", fill: "forwards" },
    );
    this.#animation = fadeOut;
    void fadeOut.finished.then(() => {
      if (transitionVersion !== this.#version) return;
      updateContent();
      const fadeIn = details.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: FADE_IN_DURATION, easing: "ease-in", fill: "forwards" },
      );
      fadeOut.cancel();
      this.#animation = fadeIn;
      void fadeIn.finished.then(() => {
        if (transitionVersion !== this.#version) return;
        fadeIn.cancel();
        this.#animation = null;
      }).catch(() => undefined);
    }).catch(() => undefined);
  }
}

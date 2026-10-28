import { DetailsTransition } from './details-transition';

interface ControlledAnimation {
  animation: { cancel: () => void; finished: Promise<void> };
  finish: () => void;
}

function createControlledAnimation(): ControlledAnimation {
  let resolveFinished: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });
  return {
    animation: {
      cancel() {
        // Replaced by tests that count cancellations.
      },
      finished,
    },
    finish() {
      resolveFinished();
    },
  };
}

function asElement(details: object): HTMLElement {
  return details as unknown as HTMLElement;
}

describe('DetailsTransition', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detail transitions update content between the fade out and fade in', async () => {
    const animations: (ControlledAnimation & { keyframes: Keyframe[]; options: KeyframeAnimationOptions })[] = [];
    const details = {
      animate(keyframes: Keyframe[], options: KeyframeAnimationOptions) {
        const controlledAnimation = createControlledAnimation();
        animations.push({ ...controlledAnimation, keyframes, options });
        return controlledAnimation.animation;
      },
    };
    let updates = 0;
    const transition = new DetailsTransition();

    transition.run(asElement(details), () => {
      updates += 1;
    });
    expect(updates).toBe(0);
    expect(animations[0].keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(animations[0].options.duration).toBe(90);

    animations[0].finish();
    await animations[0].animation.finished;
    await Promise.resolve();
    expect(updates).toBe(1);
    expect(animations[1].keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(animations[1].options.duration).toBe(140);
  });

  it('a finished fade in releases both animations', async () => {
    const animations: ControlledAnimation[] = [];
    let cancellations = 0;
    const details = {
      animate() {
        const controlledAnimation = createControlledAnimation();
        controlledAnimation.animation.cancel = () => {
          cancellations += 1;
        };
        animations.push(controlledAnimation);
        return controlledAnimation.animation;
      },
    };
    const transition = new DetailsTransition();

    transition.run(asElement(details), () => undefined);
    animations[0].finish();
    await animations[0].animation.finished;
    await Promise.resolve();
    expect(cancellations, 'The fade out is released when the fade in starts.').toBe(1);
    animations[1].finish();
    await animations[1].animation.finished;
    await Promise.resolve();
    expect(cancellations, 'The fade in is released once the card is visible.').toBe(2);
    transition.cancel();
    expect(cancellations, 'No animation remains to cancel.').toBe(2);
  });

  it('details update immediately without animation support or with reduced motion', () => {
    const transition = new DetailsTransition();
    let updates = 0;

    transition.run(asElement({}), () => {
      updates += 1;
    });
    expect(updates).toBe(1);

    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' }));
    try {
      transition.run(
        asElement({
          animate() {
            throw new Error('Reduced motion should not animate.');
          },
        }),
        () => {
          updates += 1;
        },
      );
    } finally {
      vi.unstubAllGlobals();
    }
    expect(updates).toBe(2);
  });

  it('a newer selection cancels a pending detail update', async () => {
    const animations: ControlledAnimation[] = [];
    const details = {
      animate() {
        const controlledAnimation = createControlledAnimation();
        animations.push(controlledAnimation);
        return controlledAnimation.animation;
      },
    };
    const updates: string[] = [];
    const transition = new DetailsTransition();

    transition.run(asElement(details), () => updates.push('first'));
    transition.run(asElement(details), () => updates.push('second'));
    animations[0].finish();
    await animations[0].animation.finished;
    await Promise.resolve();
    expect(updates).toEqual([]);

    animations[1].finish();
    await animations[1].animation.finished;
    await Promise.resolve();
    expect(updates).toEqual(['second']);
  });
});

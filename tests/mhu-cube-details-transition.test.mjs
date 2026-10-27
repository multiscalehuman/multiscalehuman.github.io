import assert from "node:assert/strict";
import test from "node:test";
import { DetailsTransition } from "../packages/mhu-cube/src/details-transition.ts";

function createControlledAnimation() {
  let resolveFinished;
  const finished = new Promise((resolve) => { resolveFinished = resolve; });
  return {
    animation: {
      cancel() {},
      finished,
    },
    finish() { resolveFinished(); },
  };
}

test("detail transitions update content between the fade out and fade in", async () => {
  const animations = [];
  const details = {
    animate(keyframes, options) {
      const controlledAnimation = createControlledAnimation();
      animations.push({ ...controlledAnimation, keyframes, options });
      return controlledAnimation.animation;
    },
  };
  let updates = 0;
  const transition = new DetailsTransition();

  transition.run(details, () => { updates += 1; });
  assert.equal(updates, 0);
  assert.deepEqual(animations[0].keyframes, [{ opacity: 1 }, { opacity: 0 }]);
  assert.equal(animations[0].options.duration, 90);

  animations[0].finish();
  await animations[0].animation.finished;
  await Promise.resolve();
  assert.equal(updates, 1);
  assert.deepEqual(animations[1].keyframes, [{ opacity: 0 }, { opacity: 1 }]);
  assert.equal(animations[1].options.duration, 140);
});

test("a finished fade in releases both animations", async () => {
  const animations = [];
  let cancellations = 0;
  const details = {
    animate() {
      const controlledAnimation = createControlledAnimation();
      controlledAnimation.animation.cancel = () => { cancellations += 1; };
      animations.push(controlledAnimation);
      return controlledAnimation.animation;
    },
  };
  const transition = new DetailsTransition();

  transition.run(details, () => {});
  animations[0].finish();
  await animations[0].animation.finished;
  await Promise.resolve();
  assert.equal(cancellations, 1, "The fade out is released when the fade in starts.");
  animations[1].finish();
  await animations[1].animation.finished;
  await Promise.resolve();
  assert.equal(cancellations, 2, "The fade in is released once the card is visible.");
  transition.cancel();
  assert.equal(cancellations, 2, "No animation remains to cancel.");
});

test("details update immediately without animation support or with reduced motion", () => {
  const transition = new DetailsTransition();
  let updates = 0;

  transition.run({}, () => { updates += 1; });
  assert.equal(updates, 1);

  globalThis.matchMedia = (query) => ({ matches: query === "(prefers-reduced-motion: reduce)" });
  try {
    transition.run({ animate() { throw new Error("Reduced motion should not animate."); } }, () => { updates += 1; });
  } finally {
    delete globalThis.matchMedia;
  }
  assert.equal(updates, 2);
});

test("a newer selection cancels a pending detail update", async () => {
  const animations = [];
  const details = {
    animate() {
      const controlledAnimation = createControlledAnimation();
      animations.push(controlledAnimation);
      return controlledAnimation.animation;
    },
  };
  const updates = [];
  const transition = new DetailsTransition();

  transition.run(details, () => updates.push("first"));
  transition.run(details, () => updates.push("second"));
  animations[0].finish();
  await animations[0].animation.finished;
  await Promise.resolve();
  assert.deepEqual(updates, []);

  animations[1].finish();
  await animations[1].animation.finished;
  await Promise.resolve();
  assert.deepEqual(updates, ["second"]);
});

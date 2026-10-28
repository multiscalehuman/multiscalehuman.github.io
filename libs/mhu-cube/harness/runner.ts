import type { MhuCube, MhuCubeAxes, MhuCubeItem } from '../src/index';

/** State every suite shares: the mounted component and the data it was given. Later suites see earlier changes. */
export interface HarnessContext {
  /** The shared component, mounted in the fixture container. */
  component: MhuCube;
  /** Container whose size the responsive checks change; suites mount extra components here. */
  fixture: HTMLDivElement | null;
  /** Axes given to the shared component. */
  axes: MhuCubeAxes;
  /** Datasets given to the shared component. */
  items: MhuCubeItem[];
  /** Number of datasets with a plot position. */
  positionedCount: number;
}

/** A group of harness checks run in order against the shared context. */
export type HarnessSuite = (context: HarnessContext) => Promise<void>;

const results = document.querySelector<HTMLOListElement>('#results');
/** Container for the components under test, from the harness page. */
export const fixture = document.querySelector<HTMLDivElement>('#fixture');
let failures = 0;

/**
 * Fails the current check with a message when a condition does not hold.
 * @param condition - Value that must be truthy.
 * @param message - Explanation shown in the results when the check fails.
 * @throws {Error} When the condition is falsy.
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Waits until the browser has applied pending style and layout changes.
 * @returns A promise that resolves after two animation frames.
 */
export async function nextLayout() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * Waits for a condition, checking once per layout.
 * @param predicate - Condition to wait for.
 * @param timeout - Milliseconds to wait before failing.
 * @returns A promise that resolves once the condition holds.
 * @throws {Error} When the condition still does not hold after the timeout.
 */
export async function waitFor(predicate: () => boolean, timeout = 1000) {
  const start = performance.now();
  while (!predicate()) {
    if (performance.now() - start > timeout) {
      throw new Error('Timed out waiting for the component update.');
    }
    await nextLayout();
  }
}

/**
 * Runs one named check and lists its result on the page.
 * @param name - Check name shown in the results.
 * @param callback - The check; it fails by throwing.
 * @returns A promise that resolves once the result is listed.
 */
export async function test(name: string, callback: () => void | Promise<void>) {
  const result = document.createElement('li');
  try {
    await callback();
    result.className = 'pass';
    result.textContent = `Pass: ${name}`;
  } catch (error) {
    failures += 1;
    result.className = 'fail';
    result.textContent = `Fail: ${name} — ${error instanceof Error ? error.message : String(error)}`;
  }
  results?.append(result);
}

/**
 * Runs suites one after another, then reports the overall result in the page title.
 * @param suites - Suites in run order; later suites may depend on state earlier ones leave.
 * @param context - Shared component and data passed to every suite.
 * @returns A promise that resolves after the title is set.
 */
export async function runSuites(suites: HarnessSuite[], context: HarnessContext) {
  for (const suite of suites) {
    await suite(context);
  }
  document.title = failures === 0 ? 'PASS — MHU cube browser tests' : `FAIL (${failures}) — MHU cube browser tests`;
}

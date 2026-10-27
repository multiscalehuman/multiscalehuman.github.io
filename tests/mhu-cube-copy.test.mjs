import assert from "node:assert/strict";
import test from "node:test";

import { MHU_CUBE_INTRO_COPY } from "../packages/mhu-cube/src/mhu-cube-copy.ts";

// These tests check the rules copy must follow, not its wording, so editing the copy doesn't require test changes.

/**
 * Lists every string in a copy object with its path, for failure messages.
 * @param value - Copy object, list, or string.
 * @param path - Path to the value.
 * @returns Path and text pairs.
 */
function listStrings(value, path = "MHU_CUBE_INTRO_COPY") {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((entry, index) => listStrings(entry, `${path}[${index}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, entry]) => listStrings(entry, `${path}.${key}`));
  return [];
}

test("every copy string has text and single spacing", () => {
  const { beforeLink, linkText, afterLink } = MHU_CUBE_INTRO_COPY.visualization.attribution;
  const strings = [...listStrings(MHU_CUBE_INTRO_COPY), ["attribution sentence", `${beforeLink}${linkText}${afterLink}`]];

  strings.forEach(([path, text]) => {
    assert.ok(text.trim(), `${path} is empty.`);
    assert.doesNotMatch(text, /\s{2}/, `${path} has a double space.`);
  });
});

test("the desktop heading fits its one-line space beside the visualization", () => {
  // About 28 characters fit at the default type size; the browser harness checks the rendered width.
  assert.ok(MHU_CUBE_INTRO_COPY.heading.length <= 28, `“${MHU_CUBE_INTRO_COPY.heading}” is longer than 28 characters.`);
});

test("when both descriptions state counts, they agree", () => {
  // Both descriptions summarize the same preview data, so a count edited in one must be edited in the other.
  const counts = (text = "") => text.match(/\d+/g) ?? [];
  const compact = counts(MHU_CUBE_INTRO_COPY.compactDescription);
  const desktop = counts(MHU_CUBE_INTRO_COPY.visualization.description);
  if (compact.length > 0 && desktop.length > 0) assert.deepEqual(compact, desktop, "Update the counts in both descriptions.");
});

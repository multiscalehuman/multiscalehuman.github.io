import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mhuCubeModule = await import("../packages/mhu-cube/dist/mhu-cube.js");
const bundle = await readFile(new URL("../packages/mhu-cube/dist/mhu-cube.js", import.meta.url), "utf8");
const stylesheet = await readFile(new URL("../packages/mhu-cube/dist/mhu-cube.css", import.meta.url), "utf8");

assert.equal(typeof mhuCubeModule.MhuCube, "function");
assert.equal(typeof mhuCubeModule.defineMhuCube, "function");
assert.equal(typeof mhuCubeModule.validateAxes, "function");
assert.equal(typeof mhuCubeModule.validateItems, "function");
assert.equal(typeof mhuCubeModule.validateCompactMetadata, "function");
assert.equal(typeof mhuCubeModule.validateHoverMetadata, "function");
assert.equal(mhuCubeModule.MHU_CUBE_SELECTION_EVENT, "mhu-cube-selection-change");
assert.equal(mhuCubeModule.MHU_CUBE_VALIDATION_EVENT, "mhu-cube-validation");
assert.doesNotThrow(() => mhuCubeModule.defineMhuCube());
// The element renders into the light DOM: styles ship as a separate stylesheet rather than inside the bundle.
assert.doesNotMatch(bundle, /attachShadow|\.mhu-cube__plot\s*\{/);
assert.match(stylesheet, /^mhu-cube \{/m);
assert.match(stylesheet, /\.mhu-cube__compact-card \{/);

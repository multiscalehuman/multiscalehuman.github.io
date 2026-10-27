import assert from "node:assert/strict";
import test from "node:test";

import { canPlotAxes, isSafeMetadataHref, validateAxes, validateCompactMetadata, validateHoverMetadata, validateItems } from "../packages/mhu-cube/src/validation.ts";

const validAxes = {
  time: { label: "Time", unit: "years", min: 0, max: 100 },
  space: { label: "Space", values: ["small", "large"] },
  organ: { label: "Organ", values: ["Liver", "heart", "Kidney"] },
};
const axes = validateAxes(validAxes).value;
const codes = (result) => result.issues.map((validationIssue) => validationIssue.code);

function position(overrides = {}) {
  return { time: { start: 20, end: 40 }, space: "small", organ: "Liver", ...overrides };
}

test("validateAxes sorts organs alphabetically and keeps the supplied space order", () => {
  const result = validateAxes(validAxes);

  assert.deepEqual(result.value.organ.values, ["heart", "Kidney", "Liver"]);
  assert.deepEqual(result.value.space.values, ["small", "large"]);
  assert.deepEqual(result.issues, []);
});

test("validateAxes defaults time ticks to five equal steps", () => {
  const result = validateAxes(validAxes);

  assert.deepEqual(result.value.time, { label: "Time", unit: "years", min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] });
  assert.equal(canPlotAxes(result.value), true);
});

test("validateAxes keeps valid custom ticks and replaces invalid ones", () => {
  const custom = validateAxes({ ...validAxes, time: { ...validAxes.time, ticks: [50, 0, 100, 50] } });
  assert.deepEqual(custom.value.time.ticks, [0, 50, 100]);

  const invalid = validateAxes({ ...validAxes, time: { ...validAxes.time, ticks: [0, 150] } });
  assert.deepEqual(invalid.value.time.ticks, [0, 20, 40, 60, 80, 100]);
  assert.deepEqual(codes(invalid), ["axis.time.ticks.invalid"]);
});

test("validateAxes rejects a time axis without a positive span", () => {
  const result = validateAxes({ ...validAxes, time: { label: "Time", min: 10, max: 10 } });

  assert.equal(canPlotAxes(result.value), false);
  assert.deepEqual(codes(result), ["axis.time.range.invalid"]);
});

test("validateAxes omits an empty time unit with a warning", () => {
  const result = validateAxes({ ...validAxes, time: { ...validAxes.time, unit: " " } });

  assert.equal(result.value.time.unit, undefined);
  assert.deepEqual(codes(result), ["axis.time.unit.invalid"]);
});

test("validateAxes treats organ names that differ only by case as duplicates", () => {
  const result = validateAxes({ ...validAxes, organ: { label: "Organ", values: ["Liver", "liver"] } });

  assert.deepEqual(result.value.organ.values, []);
  assert.deepEqual(codes(result), ["axis.values.duplicate"]);
  assert.equal(canPlotAxes(result.value), false);
});

test("validateAxes explains the retired x, y, and z format", () => {
  const result = validateAxes({ x: { label: "X", values: ["a"] }, y: { label: "Y", values: ["b"] }, z: { label: "Z", values: ["c"] } });

  assert.deepEqual(codes(result), ["axes.invalid"]);
  assert.match(result.issues[0].message, /retired x, y, and z/);
});

test("validateItems preserves incomplete datasets without inventing positions", () => {
  const result = validateItems([{
    id: "dataset-one",
    label: "Dataset one",
    href: "#dataset-one",
    metadata: { Organ: "Liver", Missing: null },
  }], axes);

  assert.equal(result.value.length, 1);
  assert.equal(result.value[0].position, undefined);
  assert.equal(result.value[0].metadata?.Missing, null);
  assert.deepEqual(codes(result), ["item.position.missing"]);
});

test("validateItems keeps a valid named position and its time label", () => {
  const result = validateItems([{
    id: "infant",
    label: "Infant",
    href: "#infant",
    position: position({ time: { start: 4 / 12, end: 5 / 12, label: " 4–5 months " } }),
  }], axes);

  assert.deepEqual(result.value[0].position, { time: { start: 4 / 12, end: 5 / 12, label: "4–5 months" }, space: "small", organ: "Liver" });
  assert.deepEqual(result.issues, []);
});

test("validateItems excludes unusable identities and duplicate IDs", () => {
  const result = validateItems([
    { id: "", label: "Missing identity" },
    { id: "shared", label: "First", href: "#first", position: position() },
    { id: "shared", label: "Second", href: "#second", position: position() },
  ], axes);

  assert.deepEqual(result.value.map((item) => item.label), ["First"]);
  assert.ok(codes(result).includes("item.id.invalid"));
  assert.ok(codes(result).includes("item.id.duplicate"));
});

test("validateItems preserves identifiable datasets with fallback labels and statuses", () => {
  const result = validateItems([{
    id: "fallback",
    label: "",
    href: "#fallback",
    status: "unexpected",
    position: position(),
  }], axes);

  assert.equal(result.value[0].label, "fallback");
  assert.equal(result.value[0].status, "available");
  assert.ok(codes(result).includes("item.label.invalid"));
  assert.ok(codes(result).includes("item.status.invalid"));
});

test("validateItems plots datasets that share a position", () => {
  const result = validateItems([
    { id: "first", label: "First", href: "#first", position: position() },
    { id: "second", label: "Second", href: "#second", position: position() },
  ], axes);

  assert.ok(result.value.every((item) => item.position));
  assert.deepEqual(result.issues, []);
});

test("validateItems keeps unknown categories and out-of-range times available but unplotted", () => {
  const result = validateItems([
    { id: "space", label: "Space", href: "#space", position: position({ space: "huge" }) },
    { id: "organ", label: "Organ", href: "#organ", position: position({ organ: "liver" }) },
    { id: "late", label: "Late", href: "#late", position: position({ time: { start: 90, end: 120 } }) },
    { id: "reversed", label: "Reversed", href: "#reversed", position: position({ time: { start: 50, end: 10 } }) },
  ], axes);

  assert.ok(result.value.every((item) => item.position === undefined));
  assert.deepEqual(codes(result), [
    "item.position.space.unknown",
    "item.position.organ.unknown",
    "item.position.time.out-of-range",
    "item.position.time.invalid",
  ]);
});

test("validateItems drops an empty time label but still plots the dataset", () => {
  const result = validateItems([
    { id: "blank", label: "Blank", href: "#blank", position: position({ time: { start: 10, end: 10, label: "" } }) },
  ], axes);

  assert.deepEqual(result.value[0].position?.time, { start: 10, end: 10 });
  assert.deepEqual(codes(result), ["item.position.time.label.invalid"]);
});

test("validateItems explains the retired index position format", () => {
  const result = validateItems([
    { id: "legacy", label: "Legacy", href: "#legacy", position: { x: 0, y: 0, z: 0 } },
  ], axes);

  assert.equal(result.value[0].position, undefined);
  assert.deepEqual(codes(result), ["item.position.invalid"]);
  assert.match(result.issues[0].message, /retired x, y, and z/);
});

test("validateItems removes unsafe destinations and unsupported metadata values", () => {
  const result = validateItems([{
    id: "unsafe",
    label: "Unsafe",
    href: "javascript:alert(1)",
    metadata: { Valid: 4, Invalid: { nested: true }, "": "unnamed" },
    position: position(),
  }], axes);

  assert.equal(result.value[0].href, undefined);
  assert.equal(result.value[0].status, "unavailable");
  assert.deepEqual(result.value[0].metadata, { Valid: 4 });
  assert.ok(codes(result).includes("item.href.unsafe"));
  assert.ok(codes(result).includes("item.metadata.key.invalid"));
  assert.ok(codes(result).includes("item.metadata.value.invalid"));
});

test("isSafeMetadataHref allows web destinations and rejects executable schemes", () => {
  assert.equal(isSafeMetadataHref("#local-metadata"), true);
  assert.equal(isSafeMetadataHref("../metadata/dataset"), true);
  assert.equal(isSafeMetadataHref("https://example.org/metadata"), true);
  assert.equal(isSafeMetadataHref("javascript:alert(1)"), false);
  assert.equal(isSafeMetadataHref("data:text/html,test"), false);
  assert.equal(isSafeMetadataHref("http://"), false, "Unparseable URLs are unsafe.");
});

test("validateAxes rejects malformed axes and empty or non-text categories", () => {
  const malformed = validateAxes(null);
  assert.deepEqual(codes(malformed), ["axes.invalid"]);
  assert.equal(canPlotAxes(malformed.value), false);

  const result = validateAxes({ time: "always", space: { label: "Space", values: [] }, organ: { label: "Organ", values: ["Liver", 3] } });
  assert.deepEqual(codes(result), ["axis.invalid", "axis.values.invalid", "axis.value.invalid"]);
  assert.deepEqual(result.value.space.values, []);
  assert.deepEqual(result.value.organ.values, []);
  assert.equal(canPlotAxes(result.value), false);

  assert.deepEqual(codes(validateAxes({ ...validAxes, space: undefined })), ["axis.invalid"]);
});

test("validateItems rejects a non-list and excludes non-object datasets, metadata, and positions", () => {
  assert.deepEqual(codes(validateItems({}, axes)), ["items.invalid"]);

  const result = validateItems(["dataset", { id: "current", label: "Current", href: "#current", status: "current", metadata: "Liver", position: "Liver" }], axes);
  assert.deepEqual(codes(result), ["item.invalid", "item.metadata.invalid", "item.position.invalid"]);
  assert.deepEqual(result.value, [{ id: "current", label: "Current", href: "#current", status: "current" }]);
});

test("validateCompactMetadata keeps trimmed unique names and falls back to every entry", () => {
  assert.deepEqual(validateCompactMetadata(undefined), { value: null, issues: [] });
  assert.deepEqual(validateCompactMetadata([" Corresponding authors ", "Sex", "Sex", ""]), { value: ["Corresponding authors", "Sex"], issues: [] });
  const invalid = validateCompactMetadata(["Sex", 4]);
  assert.equal(invalid.value, null);
  assert.deepEqual(codes(invalid), ["compact-metadata.invalid"]);
  assert.equal(invalid.issues[0].severity, "warning");
});

test("validateHoverMetadata keeps trimmed unique names and falls back to every entry", () => {
  assert.deepEqual(validateHoverMetadata(null), { value: null, issues: [] });
  assert.deepEqual(validateHoverMetadata([" Time ", "Sex"]), { value: ["Time", "Sex"], issues: [] });
  const invalid = validateHoverMetadata("Sex");
  assert.equal(invalid.value, null);
  assert.deepEqual(codes(invalid), ["hover-metadata.invalid"]);
});

test("validateItems keeps safe images and trims list metadata such as several authors", () => {
  const result = validateItems([
    { id: "a", label: "A", href: "#a", image: " images/a.png ", metadata: { Authors: [" Peter W. Zandstra ", "", "Fabio M.V. Rossi"] } },
    { id: "b", label: "B", href: "#b", image: "javascript:alert(1)", metadata: { Mixed: ["Name", 4] } },
  ], axes);
  assert.equal(result.value[0].image, "images/a.png");
  assert.deepEqual(result.value[0].metadata, { Authors: ["Peter W. Zandstra", "Fabio M.V. Rossi"] });
  assert.equal(result.value[1].image, undefined);
  assert.deepEqual(result.value[1].metadata, {});
  assert.deepEqual(codes(result).filter((code) => code !== "item.position.missing"), ["item.image.unsafe", "item.metadata.value.invalid"]);
  assert.equal(result.issues.find((issue) => issue.code === "item.image.unsafe")?.severity, "warning");
});

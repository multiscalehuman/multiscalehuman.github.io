import {
  getAxisEdges,
  getAxisLayout,
  getFrameEdges,
  getTimeCoordinate,
  getTimeGuide,
  projectPoint,
  type PlotLayout,
  type Point,
  type ProjectedBoxGeometry,
} from "./projection";
import type { MhuCubeAxes, MhuCubeItem, MhuCubeMetadataValue, MhuCubeTimeAxis, MhuCubeTimeRange } from "./types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const NUMBER_FORMAT = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
// Normal components below this keep a label centered on that axis instead of aligned to one side.
const LABEL_ALIGN_THRESHOLD = 0.15;

/**
 * Builds SVG path data in plot percentages, the coordinate space shared by the frame and every block.
 * @param segments - Polylines to draw, each a list of projected points.
 * @returns Path data with one move command per polyline.
 */
function toPathData(segments: Point[][]) {
  return segments
    .filter((points) => points.length > 1)
    .map((points) => points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(""))
    .join("");
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K, attributes: Record<string, string>) {
  const element = document.createElementNS(SVG_NAMESPACE, tagName);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

/**
 * Lists a dataset's displayable metadata, skipping absent values and empty lists.
 * @param item - Dataset whose metadata should be displayed.
 * @returns Label-value entries in their provided order.
 */
export function getMetadataEntries(item: MhuCubeItem) {
  return Object.entries(item.metadata ?? {}).filter(
    (entry): entry is [string, Exclude<MhuCubeMetadataValue, null | undefined>] =>
      entry[1] !== null && entry[1] !== undefined && !(Array.isArray(entry[1]) && entry[1].length === 0),
  );
}

/**
 * Formats a metadata value as one line of text, joining list entries with commas.
 * @param value - Displayable metadata value.
 * @returns Text such as "Male" or "Peter W. Zandstra, Fabio M.V. Rossi".
 */
export function formatMetadataValue(value: Exclude<MhuCubeMetadataValue, null | undefined>) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

/**
 * Formats a dataset's time range for labels and assistive technology.
 * @param range - Validated time range.
 * @param axis - Time axis supplying the unit.
 * @returns The range's own label, or its formatted values such as "45 years" or "7–47 years".
 */
export function formatTimeRange(range: MhuCubeTimeRange, axis: MhuCubeTimeAxis) {
  if (range.label) return range.label;
  const values = range.start === range.end
    ? NUMBER_FORMAT.format(range.start)
    : `${NUMBER_FORMAT.format(range.start)}–${NUMBER_FORMAT.format(range.end)}`;
  return axis.unit ? `${values} ${axis.unit}` : values;
}

/**
 * Creates the bounding cube with time guides on its far walls and floor guides through every category.
 * @param axes - Validated axes supplying the time ticks and category positions.
 * @returns A decorative SVG element with crisp, non-scaling frame lines.
 */
export function createCoordinateFrame(axes: MhuCubeAxes) {
  const svg = createSvgElement("svg", {
    class: "mhu-cube__frame",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    "aria-hidden": "true",
  });
  const layout = getAxisLayout(axes);
  const timeGuides = (axes.time.ticks ?? [])
    .filter((tick) => tick > axes.time.min && tick < axes.time.max)
    .map((tick) => getTimeGuide(getTimeCoordinate(tick, axes.time)));
  // Each floor guide runs from a category label across the floor, so a block's footprint sits on its two guides.
  const floorGuides = [
    ...layout.space.map((x) => [projectPoint(x, 0, 0), projectPoint(x, 0, 1)]),
    ...layout.organ.map((z) => [projectPoint(0, 0, z), projectPoint(1, 0, z)]),
  ];
  svg.append(
    createSvgElement("path", { class: "mhu-cube__frame-guide", d: toPathData(timeGuides) }),
    createSvgElement("path", { class: "mhu-cube__frame-floor-guide", d: toPathData(floorGuides) }),
    createSvgElement("path", { class: "mhu-cube__frame-line", d: toPathData(getFrameEdges()) }),
  );
  return svg;
}

/**
 * Picks the label box edge that touches its axis point so the box extends away from the frame.
 * @param component - One component of the edge's outward unit normal.
 * @returns A CSS translate percentage for that axis.
 */
function getLabelAlignment(component: number) {
  return component > LABEL_ALIGN_THRESHOLD ? "0%" : component < -LABEL_ALIGN_THRESHOLD ? "-100%" : "-50%";
}

/**
 * Creates visual labels for the time, space, and organ axes, placed from the frame's own edges.
 * @param axes - Validated axes; organ values arrive alphabetized.
 * @returns A decorative label layer positioned over the coordinate frame.
 */
export function createAxisLabels(axes: MhuCubeAxes) {
  const labels = document.createElement("div");
  labels.className = "mhu-cube__axes";
  labels.setAttribute("aria-hidden", "true");
  // Each label sits exactly on its axis position; CSS pushes it outward along the edge's normal.
  const addLabel = (text: string, className: string, point: Point, normal: Point) => {
    const label = document.createElement("span");
    label.className = className;
    label.textContent = text;
    label.style.left = `${point.x}%`;
    label.style.top = `${point.y}%`;
    label.style.setProperty("--axis-normal-x", normal.x.toFixed(4));
    label.style.setProperty("--axis-normal-y", normal.y.toFixed(4));
    labels.append(label);
    return label;
  };
  const along = (edge: { start: Point; end: Point }, t: number) => ({
    x: edge.start.x + (edge.end.x - edge.start.x) * t,
    y: edge.start.y + (edge.end.y - edge.start.y) * t,
  });
  const addValue = (text: string, axis: "time" | "space" | "organ", point: Point, normal: Point) => {
    const label = addLabel(text, `mhu-cube__axis-value mhu-cube__axis-value--${axis}`, point, normal);
    label.style.setProperty("--_align-x", getLabelAlignment(normal.x));
    label.style.setProperty("--_align-y", getLabelAlignment(normal.y));
  };
  // Floor titles sit centered in a second row. A sloped edge makes value labels reach farther from it, so the
  // offset clears labels up to about 4rem wide and 1rem tall, plus the title's own half size, along the normal.
  const addFloorTitle = (text: string, axis: "space" | "organ", edge: { start: Point; end: Point; normal: Point }) => {
    const label = addLabel(text, `mhu-cube__axis-title mhu-cube__axis-title--${axis}`, along(edge, 0.5), edge.normal);
    label.style.setProperty("--_offset", `${(0.75 + 1.6 * Math.abs(edge.normal.y) + 5.5 * Math.abs(edge.normal.x)).toFixed(3)}rem`);
  };

  const edges = getAxisEdges();
  const layout = getAxisLayout(axes);
  const timeTitle = axes.time.unit ? `${axes.time.label} (${axes.time.unit})` : axes.time.label;
  addLabel(timeTitle, "mhu-cube__axis-title mhu-cube__axis-title--time", edges.time.end, edges.time.normal);
  addFloorTitle(axes.space.label, "space", edges.space);
  addFloorTitle(axes.organ.label, "organ", edges.organ);
  (axes.time.ticks ?? []).forEach((tick) => {
    addValue(NUMBER_FORMAT.format(tick), "time", along(edges.time, getTimeCoordinate(tick, axes.time)), edges.time.normal);
  });
  // Space and organ labels start exactly where their floor guides meet the frame.
  axes.space.values.forEach((value, index) => addValue(value, "space", along(edges.space, layout.space[index]), edges.space.normal));
  axes.organ.values.forEach((value, index) => addValue(value, "organ", along(edges.organ, layout.organ[index]), edges.organ.normal));
  return labels;
}

/**
 * Draws a block's three visible faces from its projected corners; tall blocks become rectangular prisms.
 * @param geometry - Projected corners and percentage bounds from the plot layout.
 * @returns The decorative block SVG.
 */
export function createProjectedCube({ corners, bounds }: ProjectedBoxGeometry) {
  const pointList = (...facePoints: Point[]) => facePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const path = (...pathPoints: Point[]) => pathPoints
    .map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join("");
  const svg = createSvgElement("svg", {
    class: "mhu-cube__cube",
    viewBox: `${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`,
    preserveAspectRatio: "none",
    "aria-hidden": "true",
  });
  const topFace = [corners.topFront, corners.topLeft, corners.topBack, corners.topRight];
  const leftFace = [corners.topFront, corners.topLeft, corners.bottomLeft, corners.bottomFront];
  const rightFace = [corners.topFront, corners.topRight, corners.bottomRight, corners.bottomFront];
  svg.append(
    createSvgElement("polygon", { class: "mhu-cube__top", points: pointList(...topFace), "vector-effect": "non-scaling-stroke" }),
    createSvgElement("polygon", { class: "mhu-cube__left", points: pointList(...leftFace), "vector-effect": "non-scaling-stroke" }),
    createSvgElement("polygon", { class: "mhu-cube__right", points: pointList(...rightFace), "vector-effect": "non-scaling-stroke" }),
    createSvgElement("path", {
      class: "mhu-cube__edge",
      d: [
        path(corners.topFront, corners.topBack),
        path(corners.topLeft, corners.topRight),
        path(corners.topFront, corners.bottomLeft),
        path(corners.topLeft, corners.bottomFront),
        path(corners.topFront, corners.bottomRight),
        path(corners.topRight, corners.bottomFront),
      ].join(""),
      "vector-effect": "non-scaling-stroke",
    }),
  );
  return svg;
}

/**
 * Ties a floating block to the axes: its footprint on the floor, dashed drop lines to it, and an age marker.
 * The age marker traces the exact start and end heights level to the time axis and is revealed on hover,
 * keyboard focus, or selection, so readers never have to judge height across the perspective by eye.
 * @param block - Plot layout for one dataset, including its precomputed reference lines.
 * @returns A decorative SVG sharing the block's coordinate space, painted beneath every block.
 */
export function createBlockShadow({ floor, drops, leaders, bracket, geometry: { bounds } }: PlotLayout) {
  const svg = createSvgElement("svg", {
    class: "mhu-cube__shadow",
    viewBox: `${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}`,
    preserveAspectRatio: "none",
    "aria-hidden": "true",
  });
  svg.append(createSvgElement("polygon", {
    class: "mhu-cube__shadow-floor",
    points: floor.map((point) => `${point.x},${point.y}`).join(" "),
    "vector-effect": "non-scaling-stroke",
  }));
  if (drops.length > 0) {
    svg.append(createSvgElement("path", { class: "mhu-cube__shadow-drop", d: toPathData(drops), "vector-effect": "non-scaling-stroke" }));
  }

  const marker = createSvgElement("g", { class: "mhu-cube__time-marker" });
  marker.append(
    createSvgElement("path", { class: "mhu-cube__time-leader", d: toPathData(leaders), "vector-effect": "non-scaling-stroke" }),
    createSvgElement("path", { class: "mhu-cube__time-bracket", d: toPathData([bracket]), "vector-effect": "non-scaling-stroke" }),
  );
  svg.append(marker);
  return svg;
}

/**
 * Creates the screen-reader equivalent of the decorative axis labels.
 * @param axes - Validated axes.
 * @returns Visually hidden text describing every space category, the time span, and every organ, in that order.
 */
export function createAccessibleAxisSummary(axes: MhuCubeAxes) {
  const summary = document.createElement("p");
  summary.className = "mhu-cube__sr-only";
  const unit = axes.time.unit ? ` ${axes.time.unit}` : "";
  summary.textContent = [
    `${axes.space.label}: ${axes.space.values.join(", ")}`,
    `${axes.time.label}: ${NUMBER_FORMAT.format(axes.time.min)} to ${NUMBER_FORMAT.format(axes.time.max)}${unit}`,
    `${axes.organ.label}: ${axes.organ.values.join(", ")}`,
  ].join(". ");
  return summary;
}

/**
 * Summarizes one dataset's metadata, visualization position, and availability.
 * @param item - Dataset represented by a block control.
 * @param axes - Axis definitions used to describe its plotted position.
 * @returns A concise accessible description for the dataset control.
 */
export function getAccessibleItemDescription(item: MhuCubeItem, axes: MhuCubeAxes) {
  const metadata = getMetadataEntries(item).map(([key, value]) => `${key}: ${formatMetadataValue(value)}`);
  const position = item.position;
  const axisPosition = position ? [
    `${axes.space.label}: ${position.space}`,
    `${axes.time.label}: ${formatTimeRange(position.time, axes.time)}`,
    `${axes.organ.label}: ${position.organ}`,
  ] : [];
  const status = item.status ?? "available";
  const statusText = status === "current" ? "Current page" : status === "unavailable" ? "Metadata unavailable" : "Metadata available";
  const parts = [
    metadata.length > 0 ? metadata.join(", ") : "No dataset details provided",
    axisPosition.length > 0 ? `Visualization position: ${axisPosition.join(", ")}` : "Visualization position not provided",
    statusText,
  ];
  return `${parts.join(". ")}.`;
}

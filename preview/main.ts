import {
  MhuCube,
  defineMhuCube,
  type MhuCubeAxes,
  type MhuCubeItem,
  type MhuCubePosition,
} from "../packages/mhu-cube/src";

const SPACE = {
  hundredMicrons: "100 µm",
  hundredMillimeters: "100 mm",
} as const;

const ORGAN_DATASET_AXES: MhuCubeAxes = {
  time: { label: "Time", unit: "years", min: 0, max: 100 },
  space: { label: "Space", values: [SPACE.hundredMicrons, SPACE.hundredMillimeters] },
  // The component always displays organs alphabetically.
  organ: { label: "Organ", values: ["Heart", "Kidney", "Liver", "Thymus"] },
};

/**
 * Formats preview time ranges the same way the component does when no label is supplied.
 * @param time - Dataset time range in years.
 * @returns Display text such as "45 years" or "7–47 years".
 */
function formatTime(time: MhuCubePosition["time"]) {
  return time.label ?? (time.start === time.end ? `${time.start} years` : `${time.start}–${time.end} years`);
}

// Square preview images with transparent backgrounds, keyed by dataset ID. Datasets without one show the empty fill.
const DATASET_IMAGES: Record<string, string> = {
  "bader-liver-sbf-sem": new URL("./images/liver-bader-45.png", import.meta.url).href,
  "lee-kidney-hipct-63": new URL("./images/kidney-lee-63.png", import.meta.url).href,
  "lee-kidney-hipct-85": new URL("./images/kidney-lee-85.png", import.meta.url).href,
  "lee-heart-hipct": new URL("./images/heart-lee.png", import.meta.url).href,
  "teichmann-heart-hra-pop": new URL("./images/heart-teichmann.png", import.meta.url).href,
  "zandstra-thymus-codex": new URL("./images/thymus-zandstra.png", import.meta.url).href,
  "bader-liver-xenium": new URL("./images/liver-bader-xenium.png", import.meta.url).href,
};

/**
 * Builds a preview dataset whose title and metadata agree with its plotted position.
 * @param id - Stable dataset identity used for the metadata destination and image.
 * @param position - Time, space, and organ placement.
 * @param sex - Donor sex, shown on the visualization's cards.
 * @param authors - Corresponding authors, shown one per line on compact cards; one author takes the singular label.
 * @returns A dataset with a consistent organ, space, and time title.
 */
function createDataset(id: string, position: MhuCubePosition, sex: string, authors: string[]) {
  const time = formatTime(position.time);
  return {
    id,
    label: `${position.organ}, ${position.space}, ${time}`,
    href: `#metadata-${id}`,
    ...(DATASET_IMAGES[id] ? { image: DATASET_IMAGES[id] } : {}),
    metadata: {
      Time: time,
      Space: position.space,
      Organ: position.organ,
      Sex: sex,
      [authors.length === 1 ? "Corresponding author" : "Corresponding authors"]: authors,
    },
    position,
  };
}

type PreviewDataset = MhuCubeItem & { href: string };

const datasets: PreviewDataset[] = [
  createDataset(
    "bader-liver-sbf-sem",
    { time: { start: 45, end: 45 }, space: SPACE.hundredMicrons, organ: "Liver" },
    "Male",
    ["Cheng Xing"],
  ),
  createDataset(
    "lee-kidney-hipct-63",
    { time: { start: 63, end: 63 }, space: SPACE.hundredMillimeters, organ: "Kidney" },
    "Male",
    ["Claire L. Walsh", "Peter D. Lee"],
  ),
  createDataset(
    "lee-kidney-hipct-85",
    { time: { start: 85, end: 85 }, space: SPACE.hundredMillimeters, organ: "Kidney" },
    "Male",
    ["Claire L. Walsh", "Peter D. Lee"],
  ),
  createDataset(
    "lee-heart-hipct",
    { time: { start: 63, end: 63 }, space: SPACE.hundredMillimeters, organ: "Heart" },
    "Male",
    ["Claire L. Walsh", "Peter D. Lee"],
  ),
  createDataset(
    "teichmann-heart-hra-pop",
    { time: { start: 40, end: 70, label: "~40–70 years" }, space: SPACE.hundredMicrons, organ: "Heart" },
    "Multiple",
    ["Michela Noseda", "Sarah A. Teichmann"],
  ),
  createDataset(
    "zandstra-thymus-codex",
    { time: { start: 4 / 12, end: 5 / 12, label: "4–5 months" }, space: SPACE.hundredMicrons, organ: "Thymus" },
    "Multiple",
    ["Peter W. Zandstra", "Fabio M.V. Rossi"],
  ),
  createDataset(
    "bader-liver-xenium",
    { time: { start: 7, end: 47 }, space: SPACE.hundredMicrons, organ: "Liver" },
    "Multiple",
    ["Rachel D. Edgar"],
  ),
];

defineMhuCube();

const mhuCube = document.querySelector<MhuCube>("#mhu-cube-preview mhu-cube");
if (mhuCube) {
  mhuCube.axes = ORGAN_DATASET_AXES;
  mhuCube.items = datasets;
  // The selected-dataset card shows every detail; the hover and compact cards each show a subset.
  mhuCube.hoverMetadata = ["Time", "Space", "Organ", "Sex"];
  mhuCube.compactMetadata = ["Corresponding author", "Corresponding authors"];
}

const metadataDestinations = document.querySelector("#metadata-destinations");
const uniqueDestinations = new Map(datasets.map((dataset) => [dataset.href, dataset]));

uniqueDestinations.forEach((dataset, href) => {
  const article = document.createElement("article");
  article.id = href.slice(1);
  article.tabIndex = -1;

  const heading = document.createElement("h3");
  heading.textContent = dataset.label;

  const identifier = document.createElement("p");
  identifier.textContent = `Metadata ID: ${dataset.id}`;

  article.append(heading, identifier);
  metadataDestinations?.append(article);
});

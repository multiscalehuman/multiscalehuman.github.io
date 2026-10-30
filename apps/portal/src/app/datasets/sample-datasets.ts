import type { MhuCubeAxes, MhuCubeItem, MhuCubePosition } from '@mhu/mhu-cube';

/** Space categories used by the sample datasets, smallest first. */
const SPACE = {
  hundredMicrons: '100 µm',
  hundredMillimeters: '100 mm',
} as const;

/** Axes for the sample datasets: donor age in years, two space categories, and four organs. */
export const SAMPLE_DATASET_AXES: MhuCubeAxes = {
  time: { label: 'Time', unit: 'years', min: 0, max: 100 },
  space: { label: 'Space', values: [SPACE.hundredMicrons, SPACE.hundredMillimeters] },
  // The component always displays organs alphabetically.
  organ: { label: 'Organ', values: ['Heart', 'Kidney', 'Liver', 'Thymus'] },
};

/** Metadata names shown on the visualization's hover cards. The selected-dataset card shows every entry. */
export const SAMPLE_HOVER_METADATA = ['Space', 'Time', 'Organ', 'Sex'];

/** Metadata names shown on the compact dataset cards. */
export const SAMPLE_COMPACT_METADATA = ['Corresponding author', 'Corresponding authors'];

/**
 * Square images with transparent backgrounds, keyed by dataset ID and served from the app's public folder.
 * Datasets without one show the empty fill.
 */
const DATASET_IMAGES: Record<string, string> = {
  'bader-liver-sbf-sem': 'assets/datasets/liver-bader-45.png',
  'lee-kidney-hipct-63': 'assets/datasets/kidney-lee-63.png',
  'lee-kidney-hipct-85': 'assets/datasets/kidney-lee-85.png',
  'lee-heart-hipct': 'assets/datasets/heart-lee.png',
  'teichmann-heart-hra-pop': 'assets/datasets/heart-teichmann.png',
  'zandstra-thymus-codex': 'assets/datasets/thymus-zandstra.png',
  'bader-liver-xenium': 'assets/datasets/liver-bader-xenium.png',
};

/**
 * Formats a time range the same way the component does when no label is supplied.
 * @param time - Dataset time range in years.
 * @returns Display text such as "45 years" or "7–47 years".
 */
function formatTime(time: MhuCubePosition['time']): string {
  return time.label ?? (time.start === time.end ? `${time.start} years` : `${time.start}–${time.end} years`);
}

/**
 * Builds a sample dataset whose title and metadata agree with its plotted position.
 * @param id - Stable dataset identity used for the metadata destination and image.
 * @param position - Space, time, and organ placement.
 * @param sex - Donor sex, shown on the visualization's cards.
 * @param authors - Corresponding authors, shown one per line on compact cards; one author takes the singular label.
 * @returns A dataset whose title reads organ, space, then time, like the metadata page titles.
 */
function createDataset(id: string, position: MhuCubePosition, sex: string, authors: string[]): MhuCubeItem {
  const time = formatTime(position.time);
  const image = DATASET_IMAGES[id];
  return {
    id,
    label: `${position.organ}, ${position.space}, ${time}`,
    href: `dataset/${id}`,
    ...(image ? { image } : {}),
    metadata: {
      Space: position.space,
      Time: time,
      Organ: position.organ,
      Sex: sex,
      [authors.length === 1 ? 'Corresponding author' : 'Corresponding authors']: authors,
    },
    position,
  };
}

/** Sample organ-imaging datasets shown in the Space Time Organ Graph until real dataset metadata is available. */
export const SAMPLE_DATASETS: MhuCubeItem[] = [
  createDataset(
    'bader-liver-sbf-sem',
    { time: { start: 45, end: 45 }, space: SPACE.hundredMicrons, organ: 'Liver' },
    'Male',
    ['Cheng Xing'],
  ),
  createDataset(
    'lee-kidney-hipct-63',
    { time: { start: 63, end: 63 }, space: SPACE.hundredMillimeters, organ: 'Kidney' },
    'Male',
    ['Claire L. Walsh', 'Peter D. Lee'],
  ),
  createDataset(
    'lee-kidney-hipct-85',
    { time: { start: 85, end: 85 }, space: SPACE.hundredMillimeters, organ: 'Kidney' },
    'Male',
    ['Claire L. Walsh', 'Peter D. Lee'],
  ),
  createDataset(
    'lee-heart-hipct',
    { time: { start: 63, end: 63 }, space: SPACE.hundredMillimeters, organ: 'Heart' },
    'Male',
    ['Claire L. Walsh', 'Peter D. Lee'],
  ),
  createDataset(
    'teichmann-heart-hra-pop',
    { time: { start: 40, end: 70, label: '~40–70 years' }, space: SPACE.hundredMicrons, organ: 'Heart' },
    'Multiple',
    ['Michela Noseda', 'Sarah A. Teichmann'],
  ),
  createDataset(
    'zandstra-thymus-codex',
    { time: { start: 4 / 12, end: 5 / 12, label: '4–5 months' }, space: SPACE.hundredMicrons, organ: 'Thymus' },
    'Multiple',
    ['Peter W. Zandstra', 'Fabio M.V. Rossi'],
  ),
  createDataset(
    'bader-liver-xenium',
    { time: { start: 7, end: 47 }, space: SPACE.hundredMicrons, organ: 'Liver' },
    'Multiple',
    ['Rachel D. Edgar'],
  ),
];

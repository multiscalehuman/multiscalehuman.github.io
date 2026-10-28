import type { MhuCubeAxes, MhuCubeItem } from '../lib/types';

/** Plottable axes shared by the element specs and the browser harness. */
export const axes: MhuCubeAxes = {
  time: { label: 'Time', unit: 'years', min: 0, max: 100 },
  space: { label: 'Space', values: ['small', 'large'] },
  // Deliberately unsorted; the component displays organs alphabetically.
  organ: { label: 'Organ', values: ['Liver', 'Heart'] },
};

// "two" spans a range and overlaps the single age in "three", so they share their cell in lanes.
// "one" points at a missing image to exercise the fallback; "two" adds a detail the visualization's cards show;
// "three" lists two authors; "unplotted" has no position.
/** Datasets for the element specs. */
export const items: MhuCubeItem[] = [
  {
    id: 'one',
    label: 'Dataset one',
    href: '#one',
    image: './missing-image.png',
    metadata: { Organ: 'Heart', 'Lead author': 'Author one' },
    position: { time: { start: 20, end: 20 }, space: 'small', organ: 'Heart' },
  },
  {
    id: 'two',
    label: 'Dataset two',
    href: '#two',
    image: 'images/dataset-two.png',
    metadata: { Organ: 'Liver', Sex: 'Female', 'Lead author': 'Author two' },
    position: { time: { start: 10, end: 60 }, space: 'large', organ: 'Liver' },
  },
  {
    id: 'three',
    label: 'Dataset three',
    href: '#three',
    metadata: { Organ: 'Liver', 'Lead author': ['Author three', 'Co-author three'] },
    position: { time: { start: 30, end: 30 }, space: 'large', organ: 'Liver' },
  },
  {
    id: 'unplotted',
    label: 'Dataset without coordinates',
    href: '#unplotted',
    metadata: { Organ: 'Heart', 'Lead author': 'Author four' },
  },
];

/**
 * The element spec datasets for the browser harness, where "two" must load a real image. Its image is a plain path:
 * Vite would inline an imported small SVG as a data: URL, which the component rejects as unsafe.
 */
export const harnessItems: MhuCubeItem[] = items.map((item) =>
  item.id === 'two' ? { ...item, image: './dataset.svg' } : item,
);

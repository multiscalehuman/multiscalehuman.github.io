import { defineMhuCube, type MhuCube } from '../src/index';
// The element renders into the light DOM, so the page includes its styles.
import '../src/lib/styles/mhu-cube.scss';
import { axes, harnessItems as items } from '../src/testing/fixtures';
import { fixture, nextLayout, runSuites } from './runner';
import { blocksSuite } from './suites/blocks';
import { compactSuite } from './suites/compact';
import { invalidInputSuite } from './suites/invalid-input';
import { metadataSuite } from './suites/metadata';
import { selectionSuite } from './suites/selection';
import { structureSuite } from './suites/structure';

const positionedCount = items.filter((item) => item.position).length;

defineMhuCube();
const component = document.createElement('mhu-cube') as MhuCube;
fixture?.append(component);
component.axes = axes;
component.items = items;
await nextLayout();

// Suites share one component and run in this order, because later checks depend on the state earlier ones leave.
await runSuites([structureSuite, blocksSuite, selectionSuite, metadataSuite, compactSuite, invalidInputSuite], {
  component,
  fixture,
  axes,
  items,
  positionedCount,
});

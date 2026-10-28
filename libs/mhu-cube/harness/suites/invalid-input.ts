import { MHU_CUBE_VALIDATION_EVENT, type MhuCube } from '../../src/index';
import { assert, nextLayout, test, type HarnessContext } from '../runner';

/**
 * Checks that malformed attributes and incomplete axes are reported and fall back usefully.
 * @param context - The shared component and its data.
 * @returns A promise that resolves after every check has run.
 */
export async function invalidInputSuite({ fixture, axes, items }: HarnessContext) {
  await test('malformed JSON attributes expose validation issues instead of retaining stale data', async () => {
    const invalidComponent = document.createElement('mhu-cube') as MhuCube;
    invalidComponent.setAttribute('axes', JSON.stringify(axes));
    invalidComponent.setAttribute('items', '{invalid');
    let reportedIssueCode: string | undefined;
    fixture?.addEventListener(
      MHU_CUBE_VALIDATION_EVENT,
      (event) => {
        reportedIssueCode = event.detail.issues[0]?.code;
      },
      { once: true },
    );
    fixture?.append(invalidComponent);
    await nextLayout();
    assert(invalidComponent.items.length === 0, 'Malformed item data should not render stale datasets.');
    assert(
      invalidComponent.validationIssues.some((issue) => issue.code === 'items.json.invalid'),
      'Malformed JSON should be reported.',
    );
    assert(reportedIssueCode === 'items.json.invalid', 'Validation event must cross the component boundary.');
    invalidComponent.remove();
  });

  await test('incomplete axes replace the empty frame with a useful fallback', async () => {
    const invalidAxesComponent = document.createElement('mhu-cube') as MhuCube;
    invalidAxesComponent.setAttribute('axes', JSON.stringify({ ...axes, space: { label: 'Space', values: [] } }));
    invalidAxesComponent.setAttribute('items', JSON.stringify([items[0]]));
    fixture?.append(invalidAxesComponent);
    await nextLayout();
    assert(
      invalidAxesComponent.querySelector('.mhu-cube__plot-unavailable'),
      'Incomplete axes need a visible fallback message.',
    );
    assert(
      invalidAxesComponent.querySelector('.mhu-cube__unpositioned-button'),
      'Dataset should remain available outside the plot.',
    );
    invalidAxesComponent.remove();
  });
}

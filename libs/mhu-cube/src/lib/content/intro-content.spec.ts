import { MHU_CUBE_INTRO_CONTENT } from './intro-content';

// These tests check the rules copy must follow, not its wording, so editing the copy doesn't require test changes.

// Lists every string in a copy object with its path, for failure messages.
function listStrings(value: unknown, path = 'MHU_CUBE_INTRO_CONTENT'): [string, string][] {
  if (typeof value === 'string') {
    return [[path, value]];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => listStrings(entry, `${path}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) => listStrings(entry, `${path}.${key}`));
  }
  return [];
}

describe('MHU_CUBE_INTRO_CONTENT', () => {
  it('every copy string has text and single spacing', () => {
    const { beforeLink, linkText, afterLink } = MHU_CUBE_INTRO_CONTENT.visualization.attribution;
    const strings: [string, string][] = [
      ...listStrings(MHU_CUBE_INTRO_CONTENT),
      ['attribution sentence', `${beforeLink}${linkText}${afterLink}`],
    ];

    strings.forEach(([path, text]) => {
      expect(text.trim(), `${path} is empty.`).toBeTruthy();
      expect(text, `${path} has a double space.`).not.toMatch(/\s{2}/);
    });
  });

  it('the desktop heading fits its one-line space beside the visualization', () => {
    // About 28 characters fit at the default type size; the browser harness checks the rendered width.
    expect(
      MHU_CUBE_INTRO_CONTENT.heading.length,
      `“${MHU_CUBE_INTRO_CONTENT.heading}” is longer than 28 characters.`,
    ).toBeLessThanOrEqual(28);
  });

  it('when both descriptions state counts, they agree', () => {
    // Both descriptions summarize the same preview data, so a count edited in one must be edited in the other.
    const counts = (text = '') => text.match(/\d+/g) ?? [];
    const compact = counts(MHU_CUBE_INTRO_CONTENT.compactDescription);
    const desktop = counts(MHU_CUBE_INTRO_CONTENT.visualization.description);
    if (compact.length > 0 && desktop.length > 0) {
      expect(compact, 'Update the counts in both descriptions.').toEqual(desktop);
    }
  });
});

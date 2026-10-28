import { join } from 'node:path';
import { compileString } from 'sass';

// Specs are bundled, so resolve sources from the workspace root rather than import.meta.url.
const stylesDir = join(process.cwd(), 'libs/mhu-cube/src/lib/styles');

// Compiles a rule body against the helpers and returns its declarations, one per entry.
const declarations = (body: string) =>
  compileString(`@use 'tokens' as t;\n@use 'typography' as *;\nmhu-cube {\n${body}\n}`, { loadPaths: [stylesDir] })
    .css.split('\n')
    .slice(1, -1)
    .map((line) => line.trim());

// Evaluates one helper expression as the value of a probe property.
const value = (expression: string) => declarations(`probe: ${expression};`)[0].replace(/^probe: |;$/g, '');

describe('mhu-cube style tokens', () => {
  it('names each custom property tier by its prefix', () => {
    expect(value('t.public-name(surface)')).toBe('--mhu-cube-surface');
    expect(value('t.private-name(gutter-x)')).toBe('--_gutter-x');
    expect(value('t.sys-name(body-large-size)')).toBe('--mat-sys-body-large-size');
  });

  it('reads custom properties with and without fallbacks', () => {
    expect(value('t.slot(primary)')).toBe('var(--_primary)');
    expect(value('t.slot(area-ratio, 1)')).toBe('var(--_area-ratio, 1)');
    expect(value('t.public-slot(surface)')).toBe('var(--mhu-cube-surface)');
    expect(value('t.public-slot(surface, #fcfcfc)')).toBe('var(--mhu-cube-surface, #fcfcfc)');
    expect(value('t.sys-slot(primary)')).toBe('var(--mat-sys-primary)');
    expect(value('t.sys-slot(body-small-size, 0.75rem)')).toBe('var(--mat-sys-body-small-size, 0.75rem)');
    expect(value('t.custom-slot(cube-layer)')).toBe('var(--cube-layer)');
    expect(value('t.custom-slot(card-top, 50%)')).toBe('var(--card-top, 50%)');
  });

  it('writes list fallbacks, such as font stacks, and nested reads unchanged', () => {
    expect(value('t.sys-slot(body-large-font, (Roboto, Arial, sans-serif))')).toBe(
      'var(--mat-sys-body-large-font, Roboto, Arial, sans-serif)',
    );
    expect(value('t.custom-slot(a, t.custom-slot(b, 1.0625))')).toBe('var(--a, var(--b, 1.0625))');
  });

  it('defines private slots, unquoting string values', () => {
    expect(declarations('@include t.set(offset, 0.5rem);')).toEqual(['--_offset: 0.5rem;']);
    expect(declarations('@include t.set(gutter-x, calc(t.slot(left) + t.slot(right)));')).toEqual([
      '--_gutter-x: calc(var(--_left) + var(--_right));',
    ]);
    expect(declarations(`@include t.set(width, 'min(1px, calc(#{t.slot(a)} + 2px))');`)).toEqual([
      '--_width: min(1px, calc(var(--_a) + 2px));',
    ]);
  });

  it('defines themeable slots from the public hook, then the Material token, then the fallback', () => {
    expect(declarations('@include t.themeable(focus, primary, #be0f09);')).toEqual([
      '--_focus: var(--mhu-cube-focus, var(--mat-sys-primary, #be0f09));',
    ]);
    expect(
      declarations('@include t.themeable-colors((surface: surface #fcfcfc, on-primary: on-primary #ffffff));'),
    ).toEqual([
      '--_surface: var(--mhu-cube-surface, var(--mat-sys-surface, #fcfcfc));',
      '--_on-primary: var(--mhu-cube-on-primary, var(--mat-sys-on-primary, #ffffff));',
    ]);
  });

  it('sets a type scale role with its weight token, a literal weight, or no weight', () => {
    expect(declarations('@include typescale(body-small);')).toEqual([
      'font-family: var(--mat-sys-body-small-font, Roboto, Arial, sans-serif);',
      'font-size: var(--mat-sys-body-small-size, 0.75rem);',
      'font-weight: var(--mat-sys-body-small-weight, 400);',
      'line-height: var(--mat-sys-body-small-line-height, 1rem);',
      'letter-spacing: var(--mat-sys-body-small-tracking, 0.025rem);',
    ]);
    expect(declarations('@include typescale(label-medium, 600);')).toEqual([
      'font-family: var(--mat-sys-label-medium-font, Roboto, Arial, sans-serif);',
      'font-size: var(--mat-sys-label-medium-size, 0.75rem);',
      'font-weight: 600;',
      'line-height: var(--mat-sys-label-medium-line-height, 1rem);',
      'letter-spacing: var(--mat-sys-label-medium-tracking, 0.03125rem);',
    ]);
    expect(declarations('@include typescale(body-medium, false);')).toEqual([
      'font-family: var(--mat-sys-body-medium-font, Roboto, Arial, sans-serif);',
      'font-size: var(--mat-sys-body-medium-size, 0.875rem);',
      'line-height: var(--mat-sys-body-medium-line-height, 1.25rem);',
      'letter-spacing: var(--mat-sys-body-medium-tracking, 0.015625rem);',
    ]);
  });

  it('keeps the approved headline weights and reads single role tokens', () => {
    expect(value('typescale-slot(headline-large, weight)')).toBe('var(--mat-sys-headline-large-weight, 600)');
    expect(value('typescale-slot(headline-medium, weight)')).toBe('var(--mat-sys-headline-medium-weight, 600)');
    expect(value('typescale-slot(title-large, tracking)')).toBe('var(--mat-sys-title-large-tracking, 0)');
    expect(value('typescale-slot(body-large, font)')).toBe('var(--mat-sys-body-large-font, Roboto, Arial, sans-serif)');
  });

  it('rejects type scale roles without fallbacks', () => {
    expect(() => value('typescale-slot(display-large, size)')).toThrow(/Unknown type scale role `display-large`/);
  });
});

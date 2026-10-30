import { ContentBlockNode, ContentDefinition } from '@atlasng/content-blocks/types';
import { createSchema } from '@atlasng/content-blocks/utils';

/** JSON value of a node config key, as received by config schemas. */
type ConfigValue = NonNullable<ContentBlockNode['config']>[string] | undefined;

/** Schema accepting a string config value. */
const stringSchema = createSchema<string, ConfigValue>((value) =>
  typeof value === 'string' ? { value } : { issues: [{ message: 'Expected a string.' }] },
);

/** Schema accepting a positive number config value, or no value. */
const optionalPositiveNumberSchema = createSchema<number | undefined, ConfigValue>((value) =>
  value === undefined || (typeof value === 'number' && value > 0)
    ? { value }
    : { issues: [{ message: 'Expected a positive number.' }] },
);

/** `List`: a bulleted list. Content: `ListItem` nodes. */
export const LIST_DEFINITION = {
  name: 'List',
  component: () => import('./list').then((m) => m.List),
  host: 'ul',
  content: { content: '*' },
} satisfies ContentDefinition;

/** `ListItem`: an item of a `List`. Content: the item text and links. */
export const LIST_ITEM_DEFINITION = {
  name: 'ListItem',
  component: () => import('./list-item').then((m) => m.ListItem),
  host: 'li',
  content: { content: '*' },
} satisfies ContentDefinition;

/** `Cite`: the title of a cited work, such as a journal name. Content: the title. */
export const CITE_DEFINITION = {
  name: 'Cite',
  component: () => import('./cite').then((m) => m.Cite),
  host: 'cite',
  content: { content: '*' },
} satisfies ContentDefinition;

/**
 * `Embed`: embedded content, such as a visualization, shown as a placeholder for now. Config: `id` (machine ID) and
 * `label` (accessible name).
 */
export const EMBED_DEFINITION = {
  name: 'Embed',
  component: () => import('./embed').then((m) => m.Embed),
  config: { id: stringSchema, label: stringSchema },
} satisfies ContentDefinition;

/**
 * `Image`: an image shown at full width. Config: `src` (URL relative to the app's base URL), `alt` (text alternative),
 * and optionally `maxWidth` (width cap in pixels, such as `640` for square images).
 */
export const IMAGE_DEFINITION = {
  name: 'Image',
  component: () => import('./image').then((m) => m.ContentImage),
  host: 'img',
  config: { src: stringSchema, alt: stringSchema, maxWidth: optionalPositiveNumberSchema },
} satisfies ContentDefinition;

/** Portal definitions, registered alongside the design-system definitions. */
export const PORTAL_DEFINITIONS: ContentDefinition[] = [
  LIST_DEFINITION,
  LIST_ITEM_DEFINITION,
  CITE_DEFINITION,
  EMBED_DEFINITION,
  IMAGE_DEFINITION,
];

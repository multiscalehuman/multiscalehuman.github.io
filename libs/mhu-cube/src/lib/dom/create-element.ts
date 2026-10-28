/** Namespace for every SVG element the component creates. */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** Attribute values: `false`, `null`, and `undefined` omit the attribute, `true` sets it empty, numbers become text. */
export type AttributeValue = string | number | boolean | null | undefined;

/** Attribute names and values, set in insertion order. */
export type Attributes = Record<string, AttributeValue>;

/** A child to append: nodes as they are, strings as text, and falsy values skipped for conditional content. */
export type Child = Node | string | false | null | undefined;

/** Event listeners keyed by event name, each receiving that event's type. */
export type ElementListeners = { [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void };

/** What {@link h} sets on a new HTML element, applied in the order the fields are listed. */
export interface ElementOptions {
  /** One class string, or a list whose falsy entries are skipped; omitted when nothing remains. */
  className?: string | readonly (string | false | null | undefined)[];
  /** Attributes such as `id`, `href`, or ARIA states; see {@link AttributeValue}. */
  attrs?: Attributes;
  /** Inline style properties by CSS name, including custom properties such as `--cube-left`. */
  style?: Record<string, string>;
  /** Text content, set before any children are appended. */
  text?: string;
  /** Event listeners to add. */
  on?: ElementListeners;
}

/**
 * Sets attributes in order, skipping omitted values.
 * @param element - Element to update.
 * @param attrs - Attribute names and values.
 */
function setAttributes(element: Element, attrs: Attributes): void {
  Object.entries(attrs).forEach(([name, value]) => {
    if (value !== false && value !== null && value !== undefined) {
      element.setAttribute(name, value === true ? '' : String(value));
    }
  });
}

/**
 * Appends children in order, skipping falsy entries.
 * @param element - Parent element.
 * @param children - Nodes and text to append.
 */
function appendChildren(element: Element, children: readonly Child[]): void {
  children.forEach((child) => {
    if (child) {
      element.append(child);
    }
  });
}

/**
 * Creates an HTML element in one expression; imperative updates still work on the result.
 * @param tag - HTML tag to create, which also determines the returned element type.
 * @param options - Classes, attributes, inline styles, text, and listeners to set.
 * @param children - Nodes and text appended after any `text`, with falsy entries skipped.
 * @returns The new, unattached element.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: readonly Child[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  const { className, attrs, style, text, on } = options;
  const classes = typeof className === 'string' ? className : className?.filter(Boolean).join(' ');
  if (classes) {
    element.className = classes;
  }
  setAttributes(element, attrs ?? {});
  Object.entries(style ?? {}).forEach(([name, value]) => element.style.setProperty(name, value));
  if (text !== undefined) {
    element.textContent = text;
  }
  Object.entries(on ?? {}).forEach(([type, listener]) => element.addEventListener(type, listener as EventListener));
  appendChildren(element, children);
  return element;
}

/**
 * Creates an SVG element in the SVG namespace; classes go in `attrs` as `class`.
 * @param tag - SVG tag to create, which also determines the returned element type.
 * @param attrs - Attributes to set, in order; see {@link AttributeValue}.
 * @param children - Nodes and text to append, with falsy entries skipped.
 * @returns The new, unattached SVG element.
 */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attributes = {},
  children: readonly Child[] = [],
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NAMESPACE, tag);
  setAttributes(element, attrs);
  appendChildren(element, children);
  return element;
}

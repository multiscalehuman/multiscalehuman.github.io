import type { MhuCubeAxes, MhuCubeItem } from "./types";
import { MHU_CUBE_INTRO_COPY } from "./mhu-cube-copy";
import { formatMetadataValue, formatTimeRange, getMetadataEntries } from "./mhu-cube-visualization";
import { canPlotAxes } from "./validation";

type MetadataEntry = ReturnType<typeof getMetadataEntries>[number];

/**
 * Creates the Material close glyph used by the desktop details button.
 * @returns A decorative 24-pixel SVG icon that inherits the button color.
 */
function createCloseIcon() {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.classList.add("mhu-cube__details-close-icon");
  icon.setAttribute("width", "24");
  icon.setAttribute("height", "24");
  icon.setAttribute("viewBox", "0 -960 960 960");
  icon.setAttribute("fill", "currentColor");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z");
  icon.append(path);
  return icon;
}

/**
 * Creates the component introduction shared by desktop and compact layouts.
 * @param details - Persistent desktop details region displayed in place of the dimension key.
 * @returns A heading group containing the configured introduction copy and details region.
 */
export function createIntro(details: HTMLElement) {
  const intro = document.createElement("header");
  intro.className = "mhu-cube__intro";
  if (MHU_CUBE_INTRO_COPY.eyebrow) {
    const eyebrow = document.createElement("p");
    eyebrow.className = "mhu-cube__intro-eyebrow";
    eyebrow.textContent = MHU_CUBE_INTRO_COPY.eyebrow;
    intro.append(eyebrow);
  }
  // One heading whose text suits each layout; the hidden variant leaves the accessibility tree with display: none.
  const heading = document.createElement("h2");
  heading.className = "mhu-cube__intro-heading";
  const wideHeading = document.createElement("span");
  wideHeading.className = "mhu-cube__intro-heading-wide";
  wideHeading.textContent = MHU_CUBE_INTRO_COPY.heading;
  const compactHeading = document.createElement("span");
  compactHeading.className = "mhu-cube__intro-heading-compact";
  compactHeading.textContent = MHU_CUBE_INTRO_COPY.compactHeading;
  heading.append(wideHeading, compactHeading);

  const visualization = document.createElement("div");
  visualization.className = "mhu-cube__intro-visualization";
  const visualizationDescription = document.createElement("p");
  visualizationDescription.className = "mhu-cube__intro-summary";
  visualizationDescription.textContent = MHU_CUBE_INTRO_COPY.visualization.description;
  const dimensionHeadings = document.createElement("div");
  dimensionHeadings.className = "mhu-cube__intro-dimensions-header";
  dimensionHeadings.setAttribute("aria-hidden", "true");
  MHU_CUBE_INTRO_COPY.visualization.dimensionHeadings.forEach((headingText) => {
    const dimensionHeading = document.createElement("span");
    dimensionHeading.textContent = headingText;
    dimensionHeadings.append(dimensionHeading);
  });
  const dimensions = document.createElement("dl");
  dimensions.className = "mhu-cube__intro-dimensions";
  MHU_CUBE_INTRO_COPY.visualization.dimensions.forEach((dimension) => {
    const row = document.createElement("div");
    row.className = "mhu-cube__intro-dimensions-row";
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = dimension.term;
    description.textContent = dimension.description;
    row.append(term, description);
    dimensions.append(row);
  });
  const attribution = document.createElement("p");
  attribution.className = "mhu-cube__intro-attribution";
  const attributionLink = document.createElement("a");
  attributionLink.href = MHU_CUBE_INTRO_COPY.visualization.attribution.href;
  attributionLink.textContent = MHU_CUBE_INTRO_COPY.visualization.attribution.linkText;
  attribution.append(
    MHU_CUBE_INTRO_COPY.visualization.attribution.beforeLink,
    attributionLink,
    MHU_CUBE_INTRO_COPY.visualization.attribution.afterLink,
  );
  visualization.append(visualizationDescription, dimensionHeadings, dimensions, details, attribution);
  intro.append(heading, visualization);
  return intro;
}

/**
 * Combines a concise visible label with available metadata for a unique accessible name.
 * @param item - Dataset whose label and metadata should be described.
 * @returns A descriptive dataset name suitable for controls and links.
 */
export function getAccessibleDatasetName(item: MhuCubeItem) {
  const metadata = getMetadataEntries(item).map(([key, value]) => `${key}: ${formatMetadataValue(value)}`).join(", ");
  return metadata ? `${item.label}; ${metadata}` : item.label;
}

/**
 * Builds the semantic metadata definition list shared by dataset cards.
 * @param entries - Metadata entries to display, in order.
 * @param className - Class for the list; each row gets the same class with a `-row` suffix.
 * @param listsOnSeparateLines - Whether list values get one description per entry instead of one comma-separated line.
 * @returns A grouped definition list, or null when there is nothing to display.
 */
function createMetadataList(entries: MetadataEntry[], className = "mhu-cube__details-metadata", listsOnSeparateLines = false) {
  if (entries.length === 0) return null;

  const metadata = document.createElement("dl");
  metadata.className = className;
  entries.forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = `${className}-row`;
    const term = document.createElement("dt");
    term.textContent = key;
    row.append(term);
    (Array.isArray(value) && listsOnSeparateLines ? value : [formatMetadataValue(value)]).forEach((entry) => {
      const description = document.createElement("dd");
      description.textContent = entry;
      row.append(description);
    });
    metadata.append(row);
  });
  return metadata;
}

/**
 * Explains that a dataset has no metadata destination.
 * @returns A noninteractive availability message.
 */
function createUnavailableMessage() {
  const unavailable = document.createElement("p");
  unavailable.className = "mhu-cube__details-unavailable";
  unavailable.textContent = "Metadata is not currently available for this dataset.";
  return unavailable;
}

/**
 * Builds the dataset destination or its unavailable-state message.
 * @param item - Dataset whose destination should be exposed.
 * @param actionClassName - CSS class applied when an actionable link is available.
 * @returns A direct link or a noninteractive availability message.
 */
function createDestination(item: MhuCubeItem, actionClassName: string) {
  const status = item.status ?? "available";
  if (status === "unavailable" || !item.href) return createUnavailableMessage();

  const action = document.createElement("a");
  action.className = actionClassName;
  action.href = item.href;
  action.setAttribute("aria-label", `View metadata for ${getAccessibleDatasetName(item)}${status === "current" ? ", current page" : ""}`);
  action.textContent = "View metadata";
  return action;
}

/**
 * Picks metadata entries by name, in the order named.
 * @param item - Dataset whose metadata should be displayed.
 * @param names - Metadata names, matched ignoring case and surrounding spaces.
 * @returns The matching entries.
 */
function getNamedMetadataEntries(item: MhuCubeItem, names: string[]) {
  const entries = getMetadataEntries(item);
  return names.flatMap((name) => entries.filter(([key]) => key.trim().toLowerCase() === name.toLowerCase()));
}

/**
 * Creates the transient preview shown beside a desktop cube.
 * @param item - Dataset represented by the cube.
 * @param hoverMetadata - Metadata names to show, or null for every entry.
 * @returns A presentation-only card containing safely escaped text nodes.
 */
export function createPreviewCard(item: MhuCubeItem, hoverMetadata: string[] | null = null) {
  const card = document.createElement("span");
  card.className = "mhu-cube__card";
  card.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "mhu-cube__label";
  label.textContent = item.label;
  card.append(label);

  const entries = hoverMetadata ? getNamedMetadataEntries(item, hoverMetadata) : getMetadataEntries(item);
  if (entries.length > 0) {
    const metadata = document.createElement("span");
    metadata.className = "mhu-cube__metadata";
    entries.forEach(([key, value]) => {
      const term = document.createElement("span");
      const description = document.createElement("span");
      term.className = "mhu-cube__metadata-key";
      description.className = "mhu-cube__metadata-value";
      term.textContent = key;
      description.textContent = formatMetadataValue(value);
      metadata.append(term, description);
    });
    card.append(metadata);
  }

  if (item.status === "current" || item.status === "unavailable") {
    const status = document.createElement("span");
    status.className = "mhu-cube__status";
    status.textContent = item.status === "current" ? "Current page" : "Unavailable";
    card.append(status);
  }
  return card;
}

/**
 * Creates the persistent live region for desktop dataset details.
 * @param detailsId - Stable ID used by dataset controls to reference the panel.
 * @returns An empty live region populated after a dataset is selected.
 */
export function createDetails(detailsId: string) {
  const details = document.createElement("div");
  details.className = "mhu-cube__details";
  details.id = detailsId;
  details.setAttribute("aria-live", "polite");
  details.setAttribute("aria-atomic", "true");
  return details;
}

/**
 * Updates the mounted desktop details region after selection changes.
 * @param details - Stable details landmark whose content should be replaced.
 * @param item - Selected dataset, or null before a selection is made.
 * @param headingId - Stable ID used to label the details landmark.
 * @param closeDetails - Clears the current desktop selection.
 * @returns The updated details landmark.
 */
export function updateDetails(details: HTMLElement, item: MhuCubeItem | null, headingId: string, closeDetails: () => void) {
  details.replaceChildren();
  if (!item) return details;

  const card = document.createElement("article");
  card.className = "mhu-cube__details-card";
  card.setAttribute("aria-labelledby", headingId);
  const header = document.createElement("div");
  header.className = "mhu-cube__details-header";
  const title = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "mhu-cube__details-eyebrow";
  eyebrow.textContent = "Selected dataset";
  const heading = document.createElement("h3");
  heading.className = "mhu-cube__details-heading";
  heading.id = headingId;
  heading.textContent = item.label;
  const close = document.createElement("button");
  close.className = "mhu-cube__details-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close dataset details");
  close.append(createCloseIcon());
  close.addEventListener("click", closeDetails);
  title.append(eyebrow, heading);
  header.append(title, close);
  card.append(header);

  const metadata = createMetadataList(getMetadataEntries(item));
  if (metadata) card.append(metadata);
  card.append(createDestination(item, "mhu-cube__details-action"));
  details.append(card);
  return details;
}

/**
 * Drops metadata that repeats a dimension the card already shows, matched by axis label.
 * @param item - Dataset whose metadata should be displayed.
 * @param axes - Validated axes whose labels identify repeated entries.
 * @returns The remaining metadata entries in their provided order.
 */
function getRemainingMetadataEntries(item: MhuCubeItem, axes: MhuCubeAxes) {
  const dimensionLabels = new Set([axes.time.label, axes.space.label, axes.organ.label].map((label) => label.trim().toLowerCase()));
  return getMetadataEntries(item).filter(([key]) => !dimensionLabels.has(key.trim().toLowerCase()));
}

/**
 * Chooses the metadata a compact card shows below its title.
 * @param item - Dataset represented by the card.
 * @param axes - Validated axes whose labels identify entries the card already shows.
 * @param hasPosition - Whether the card shows time, space, and organ itself.
 * @param compactMetadata - Names to show in order, matched ignoring case, or null for every remaining entry.
 * @returns The entries to display.
 */
function getCompactMetadataEntries(item: MhuCubeItem, axes: MhuCubeAxes, hasPosition: boolean, compactMetadata: string[] | null) {
  if (!compactMetadata) return hasPosition ? getRemainingMetadataEntries(item, axes) : getMetadataEntries(item);
  return getNamedMetadataEntries(item, compactMetadata);
}

/**
 * Creates a self-contained dataset card for layouts without the cube canvas: a square image, time and space,
 * the organ as the title, and the chosen metadata. The image and title both open the metadata page; with a
 * touch screen, the title link stretches over the whole card.
 * @param item - Dataset represented by the card.
 * @param axes - Validated axes used for dimension labels and the time unit.
 * @param compactMetadata - Metadata names to show, or null for every entry the card does not already show.
 * @returns A card whose links share the dataset's metadata destination.
 */
export function createCompactCard(item: MhuCubeItem, axes: MhuCubeAxes, compactMetadata: string[] | null = null) {
  const card = document.createElement("article");
  card.className = "mhu-cube__compact-card";
  const status = item.status ?? "available";
  const href = status === "unavailable" ? undefined : item.href;
  const position = canPlotAxes(axes) ? item.position : undefined;

  // The image repeats the title link for pointer users, so it stays out of the tab order and accessibility tree.
  const media = document.createElement(href ? "a" : "div");
  media.className = "mhu-cube__compact-media";
  if (media instanceof HTMLAnchorElement && href) {
    media.href = href;
    media.tabIndex = -1;
    media.setAttribute("aria-hidden", "true");
  }
  if (item.image) {
    const image = document.createElement("img");
    image.className = "mhu-cube__compact-image";
    image.src = item.image;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => image.remove(), { once: true });
    media.append(image);
  }

  const body = document.createElement("div");
  body.className = "mhu-cube__compact-body";
  if (position) {
    const facts = document.createElement("dl");
    facts.className = "mhu-cube__compact-facts";
    [
      [axes.time.label, formatTimeRange(position.time, axes.time)],
      [axes.space.label, position.space],
    ].forEach(([label, value]) => {
      const fact = document.createElement("div");
      fact.className = "mhu-cube__compact-fact";
      const term = document.createElement("dt");
      term.className = "mhu-cube__sr-only";
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      fact.append(term, description);
      facts.append(fact);
    });
    body.append(facts);
  }

  const heading = document.createElement("h3");
  heading.className = "mhu-cube__compact-heading";
  const title = position?.organ ?? item.label;
  if (href) {
    const link = document.createElement("a");
    link.className = "mhu-cube__compact-link";
    link.href = href;
    link.textContent = title;
    if (status === "current") link.setAttribute("aria-current", "page");
    // Several datasets share an organ, so hidden time and space text completes each link's name.
    if (position) {
      const context = document.createElement("span");
      context.className = "mhu-cube__sr-only";
      context.textContent = `, ${formatTimeRange(position.time, axes.time)}, ${position.space}`;
      link.append(context);
    }
    heading.append(link);
  } else heading.textContent = title;
  body.append(heading);

  if (status === "current") {
    const badge = document.createElement("p");
    badge.className = "mhu-cube__compact-badge";
    badge.textContent = "Current page";
    body.append(badge);
  }
  const details = createMetadataList(getCompactMetadataEntries(item, axes, Boolean(position), compactMetadata), "mhu-cube__compact-details", true);
  if (details) body.append(details);
  if (!href) body.append(createUnavailableMessage());

  card.append(media, body);
  return card;
}

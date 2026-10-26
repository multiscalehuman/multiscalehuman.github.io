import { createCompactCard, createDetails, createIntro, createPreviewCard, getAccessibleDatasetName, updateDetails } from "./mhu-cube-cards";
import {
  createAccessibleAxisSummary,
  createAxisLabels,
  createBlockShadow,
  createCoordinateFrame,
  createProjectedCube,
  getAccessibleItemDescription,
} from "./mhu-cube-visualization";
import { DetailsTransition } from "./details-transition";
import { DRAWING_AREA_RATIO, layoutPlot, sortItemsForDisplay, type PlotLayout } from "./projection";
import type {
  MhuCubeAxes,
  MhuCubeItem,
  MhuCubeSelectionDetail,
  MhuCubeValidationDetail,
  MhuCubeValidationIssue,
} from "./types";
import { EMPTY_AXES, canPlotAxes, validateAxes, validateCompactMetadata, validateHoverMetadata, validateItems } from "./validation";

export type {
  MhuCubeAxes,
  MhuCubeCategoryAxis,
  MhuCubeItem,
  MhuCubeItemStatus,
  MhuCubeMetadataValue,
  MhuCubePosition,
  MhuCubeSelectionDetail,
  MhuCubeTimeAxis,
  MhuCubeTimeRange,
  MhuCubeValidationDetail,
  MhuCubeValidationIssue,
  MhuCubeValidationSeverity,
} from "./types";

export const MHU_CUBE_SELECTION_EVENT = "mhu-cube-selection-change";
export const MHU_CUBE_VALIDATION_EVENT = "mhu-cube-validation";

declare global {
  interface HTMLElementTagNameMap {
    "mhu-cube": MhuCube;
  }

  interface GlobalEventHandlersEventMap {
    "mhu-cube-selection-change": CustomEvent<MhuCubeSelectionDetail>;
    "mhu-cube-validation": CustomEvent<MhuCubeValidationDetail>;
  }
}

const HTMLElementBase = (
  typeof HTMLElement === "undefined" ? class {} : HTMLElement
) as typeof HTMLElement;
let instanceCount = 0;

/**
 * Accessible, responsive dataset preview custom element. It renders into the light DOM, so it takes its styles from
 * the page: include `mhu-cube.scss` (or the prebuilt `mhu-cube.css`), and page stylesheets can restyle its parts.
 */
export class MhuCube extends HTMLElementBase {
  static observedAttributes = ["items", "axes", "label", "compact-metadata", "hover-metadata"];
  #sourceItems: unknown = [];
  #items: MhuCubeItem[] = [];
  #axes: MhuCubeAxes = EMPTY_AXES;
  #axisIssues: MhuCubeValidationIssue[] = [];
  #itemIssues: MhuCubeValidationIssue[] = [];
  #attributeIssues: MhuCubeValidationIssue[] = [];
  #compactMetadata: string[] | null = null;
  #compactMetadataIssues: MhuCubeValidationIssue[] = [];
  #hoverMetadata: string[] | null = null;
  #hoverMetadataIssues: MhuCubeValidationIssue[] = [];
  #selectedId: string | null = null;
  #instanceId = `mhu-cube-${++instanceCount}`;
  #section: HTMLElement | null = null;
  #details: HTMLElement | null = null;
  #stage: HTMLElement | null = null;
  #plot: HTMLElement | null = null;
  #detailsId = `${this.#instanceId}-details`;
  #detailsHeadingId = `${this.#instanceId}-details-heading`;
  #updateScheduled = false;
  #validationPending = false;
  #detailsTransition = new DetailsTransition();

  /** Normalized datasets currently available to the component. */
  get items() { return this.#items; }
  set items(value: MhuCubeItem[]) {
    this.#sourceItems = value;
    this.#applyItems();
    this.#scheduleUpdate(true);
  }
  /** Normalized time, space, and organ axes used by the desktop visualization. */
  get axes() { return this.#axes; }
  set axes(value: MhuCubeAxes) {
    this.#applyAxes(value);
    this.#scheduleUpdate(true);
  }
  /** Metadata names shown on compact cards, in order; null shows every entry the card does not already show. */
  get compactMetadata() { return this.#compactMetadata; }
  set compactMetadata(value: string[] | null) {
    this.#applyCompactMetadata(value);
    this.#scheduleUpdate(true);
  }
  /** Metadata names shown on the desktop hover card, in order; null shows every entry. */
  get hoverMetadata() { return this.#hoverMetadata; }
  set hoverMetadata(value: string[] | null) {
    this.#applyHoverMetadata(value);
    this.#scheduleUpdate(true);
  }
  /** Current configuration errors and warnings. */
  get validationIssues() {
    return [
      ...this.#attributeIssues,
      ...this.#compactMetadataIssues,
      ...this.#hoverMetadataIssues,
      ...this.#axisIssues,
      ...this.#itemIssues,
    ];
  }
  /** ID selected in the desktop visualization, or null. */
  get selectedId() { return this.#selectedId; }
  set selectedId(value: string | null) {
    this.#selectedId = this.#items.some((item) => item.id === value) ? value : null;
    this.#scheduleUpdate(false);
  }
  connectedCallback() {
    this.#readJsonAttribute("axes", false);
    this.#readJsonAttribute("items", false);
    this.#scheduleUpdate(true);
  }
  disconnectedCallback() {
    this.#detailsTransition.cancel();
  }
  attributeChangedCallback(name: string) {
    if (name === "compact-metadata") this.#applyCompactMetadata(this.#parseJsonAttribute(name));
    else if (name === "hover-metadata") this.#applyHoverMetadata(this.#parseJsonAttribute(name));
    else if (name !== "label") this.#readJsonAttribute(name as "axes" | "items", true);
    this.#scheduleUpdate(name !== "label");
  }

  #applyCompactMetadata(value: unknown) {
    const result = validateCompactMetadata(value);
    this.#compactMetadata = result.value;
    this.#compactMetadataIssues = result.issues;
  }

  #applyHoverMetadata(value: unknown) {
    const result = validateHoverMetadata(value);
    this.#hoverMetadata = result.value;
    this.#hoverMetadataIssues = result.issues;
  }

  /**
   * Reads a JSON attribute for a setting that validates its own value.
   * @param name - Attribute name.
   * @returns The parsed value, undefined when the attribute is absent, or the raw text when it is not JSON.
   */
  #parseJsonAttribute(name: string): unknown {
    const serializedValue = this.getAttribute(name);
    if (serializedValue === null) return undefined;
    try { return JSON.parse(serializedValue) as unknown; } catch { return serializedValue; }
  }

  /**
   * Coalesces synchronous property and attribute changes into one render and validation event.
   * @param reportValidation - Whether this update changes component configuration.
   * @returns Nothing.
   */
  #scheduleUpdate(reportValidation: boolean) {
    this.#validationPending ||= reportValidation;
    if (this.#updateScheduled) return;
    this.#updateScheduled = true;
    queueMicrotask(() => {
      this.#updateScheduled = false;
      if (!this.isConnected) return;
      this.#render();
      if (this.#validationPending) this.#reportValidation();
      this.#validationPending = false;
    });
  }

  #applyItems() {
    const result = validateItems(this.#sourceItems, this.#axes);
    this.#items = result.value;
    this.#itemIssues = result.issues;
    if (!this.#items.some((item) => item.id === this.#selectedId)) this.#selectedId = null;
  }

  #applyAxes(value: unknown) {
    const result = validateAxes(value);
    this.#axes = result.value;
    this.#axisIssues = result.issues;
    this.#applyItems();
  }

  #readJsonAttribute(name: "axes" | "items", clearWhenMissing: boolean) {
    this.#attributeIssues = this.#attributeIssues.filter((validationIssue) => validationIssue.path !== name);
    const serializedValue = this.getAttribute(name);
    if (serializedValue === null) {
      if (clearWhenMissing) {
        if (name === "axes") this.#applyAxes(EMPTY_AXES);
        else {
          this.#sourceItems = [];
          this.#applyItems();
        }
      }
      return;
    }

    let value: unknown;
    try { value = JSON.parse(serializedValue) as unknown; } catch {
      this.#attributeIssues.push({
        code: `${name}.json.invalid`,
        message: `${name} contains invalid JSON.`,
        path: name,
        severity: "error",
      });
    }
    if (name === "axes") this.#applyAxes(value);
    else {
      this.#sourceItems = value;
      this.#applyItems();
    }
  }

  #reportValidation() {
    if (!this.isConnected) return;
    this.dispatchEvent(new CustomEvent<MhuCubeValidationDetail>(MHU_CUBE_VALIDATION_EVENT, {
      bubbles: true,
      composed: true,
      detail: { issues: this.validationIssues },
    }));
  }

  /**
   * Applies a desktop selection and coordinates focus, animation, and the public event.
   * @param item - Validated dataset selected by the user.
   * @param moveFocusToAction - Whether keyboard activation should focus the resulting metadata link.
   * @returns Nothing.
   */
  #selectItem(item: MhuCubeItem, moveFocusToAction: boolean) {
    const selectionChanged = this.#selectedId !== item.id;
    this.#selectedId = item.id;
    this.#updateSelection();
    if (selectionChanged && this.#details) {
      this.#detailsTransition.run(this.#details, () => {
        if (!this.#details) return;
        updateDetails(this.#details, item, this.#detailsHeadingId, () => this.#closeDetails());
        if (moveFocusToAction) {
          this.#details.querySelector<HTMLAnchorElement>(".mhu-cube__details-action")?.focus();
        }
      });
    } else if (moveFocusToAction) {
      this.#details?.querySelector<HTMLAnchorElement>(".mhu-cube__details-action")?.focus();
    }
    this.dispatchEvent(new CustomEvent<MhuCubeSelectionDetail>(MHU_CUBE_SELECTION_EVENT, {
      bubbles: true,
      composed: true,
      detail: { item },
    }));
  }

  /**
   * Clears the desktop selection, restores the dimension key, and returns focus to its cube.
   * @returns Nothing.
   */
  #closeDetails() {
    const selectedId = this.#selectedId;
    if (!selectedId || !this.#details) return;
    const selectedButton = [...this.querySelectorAll<HTMLButtonElement>("[data-item-id]")]
      .find((button) => button.dataset.itemId === selectedId);
    this.#detailsTransition.cancel();
    this.#selectedId = null;
    this.#updateSelection();
    updateDetails(this.#details, null, this.#detailsHeadingId, () => this.#closeDetails());
    selectedButton?.focus();
    this.dispatchEvent(new CustomEvent<MhuCubeSelectionDetail>(MHU_CUBE_SELECTION_EVENT, {
      bubbles: true,
      composed: true,
      detail: { item: null },
    }));
  }

  /**
   * Creates the stable regions that survive incremental selection updates, replacing any children the element had.
   * @returns Nothing.
   */
  #createStructure() {
    const section = document.createElement("section");
    section.className = "mhu-cube";
    const content = document.createElement("div");
    content.className = "mhu-cube__content";
    const details = createDetails(this.#detailsId);
    content.append(createIntro(details));
    const stage = document.createElement("div");
    stage.className = "mhu-cube__stage";
    const plot = document.createElement("div");
    plot.className = "mhu-cube__plot";
    stage.append(plot);
    section.append(content, stage);
    this.replaceChildren(section);
    this.#section = section;
    this.#details = details;
    this.#stage = stage;
    this.#plot = plot;
  }

  /**
   * Synchronizes cube controls and visual selection classes without rebuilding the scene.
   * @returns Nothing.
   */
  #updateSelection() {
    const selectedItem = this.#items.find((item) => item.id === this.#selectedId) ?? null;
    this.#section?.classList.toggle("mhu-cube--has-selection", Boolean(selectedItem));
    this.querySelectorAll<HTMLButtonElement>("[data-item-id]").forEach((button) => {
      const selected = button.dataset.itemId === selectedItem?.id;
      button.closest("li")?.classList.toggle("mhu-cube__item--selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  /**
   * Adds the shared accessible state and interaction behavior to a dataset control.
   * @param button - Native button associated with a dataset.
   * @param item - Validated dataset controlled by the button.
   * @param descriptionId - ID of the button's accessible dataset description.
   * @returns Nothing.
   */
  #configureSelectionButton(button: HTMLButtonElement, item: MhuCubeItem, descriptionId: string) {
    button.type = "button";
    button.dataset.itemId = item.id;
    button.setAttribute("aria-label", `Select ${getAccessibleDatasetName(item)}`);
    button.setAttribute("aria-describedby", descriptionId);
    button.setAttribute("aria-controls", this.#detailsId);
    button.setAttribute("aria-pressed", String(item.id === this.#selectedId));
    button.addEventListener("click", (event) => this.#selectItem(item, event.detail === 0));
  }

  /**
   * Creates the desktop fallback for datasets without usable plot coordinates.
   * @param items - Validated datasets that cannot be positioned on the cube.
   * @param itemIndexes - Stable source indexes used to generate unique description IDs.
   * @returns A selectable fallback region for unpositioned datasets.
   */
  #createUnpositionedList(items: MhuCubeItem[], itemIndexes: Map<string, number>) {
    const region = document.createElement("section");
    region.className = "mhu-cube__unpositioned";
    const heading = document.createElement("h3");
    heading.className = "mhu-cube__unpositioned-heading";
    heading.textContent = "Not plotted";
    const guidance = document.createElement("p");
    guidance.className = "mhu-cube__unpositioned-guidance";
    guidance.textContent = "These datasets do not include usable visualization coordinates.";
    const list = document.createElement("ul");
    list.className = "mhu-cube__unpositioned-list";
    items.forEach((item) => {
      const index = itemIndexes.get(item.id) ?? 0;
      const listItem = document.createElement("li");
      listItem.className = "mhu-cube__unpositioned-item";
      if (item.id === this.#selectedId) listItem.classList.add("mhu-cube__item--selected");
      const description = document.createElement("span");
      description.className = "mhu-cube__sr-only";
      description.id = `${this.#instanceId}-unpositioned-${index}-description`;
      description.textContent = getAccessibleItemDescription(item, this.#axes);
      const button = document.createElement("button");
      button.className = "mhu-cube__unpositioned-button";
      button.textContent = item.label;
      this.#configureSelectionButton(button, item, description.id);
      listItem.append(description, button);
      list.append(listItem);
    });
    region.append(heading, guidance, list);
    return region;
  }

  /**
   * Reconciles validated data with the stable component structure.
   * @returns Nothing.
   */
  #render() {
    if (!this.#section || !this.#details || !this.#stage || !this.#plot) this.#createStructure();
    if (!this.#section || !this.#details || !this.#stage || !this.#plot) return;

    this.#section.setAttribute("aria-label", this.getAttribute("label") ?? "Metadata datasets");
    this.#plot.style.setProperty("--_area-ratio", String(DRAWING_AREA_RATIO));
    this.#stage.querySelector(".mhu-cube__unpositioned")?.remove();
    const axesCanBePlotted = canPlotAxes(this.#axes);
    if (axesCanBePlotted) {
      this.#plot.replaceChildren(createCoordinateFrame(this.#axes), createAxisLabels(this.#axes), createAccessibleAxisSummary(this.#axes));
    } else {
      const unavailable = document.createElement("p");
      unavailable.className = "mhu-cube__plot-unavailable";
      unavailable.textContent = "Visualization unavailable because the axis data is incomplete.";
      this.#plot.replaceChildren(unavailable);
    }
    const selectedItem = this.#items.find((item) => item.id === this.#selectedId) ?? null;
    this.#section.classList.toggle("mhu-cube--has-selection", Boolean(selectedItem));
    this.#detailsTransition.cancel();
    updateDetails(this.#details, selectedItem, this.#detailsHeadingId, () => this.#closeDetails());
    if (this.#items.length === 0) {
      if (axesCanBePlotted) {
        const empty = document.createElement("p");
        empty.className = "mhu-cube__empty";
        empty.textContent = "No datasets are available.";
        this.#plot.append(empty);
      }
      return;
    }

    const list = document.createElement("ul");
    list.className = "mhu-cube__list";
    const itemIndexes = new Map(this.#items.map((item, index) => [item.id, index]));
    const layout = axesCanBePlotted ? layoutPlot(this.#items, this.#axes) : new Map<string, PlotLayout>();
    // Source order keeps description IDs stable; display order follows the plot for reading and keyboard use.
    sortItemsForDisplay(this.#items, this.#axes).forEach((item) => {
      const index = itemIndexes.get(item.id) ?? 0;
      const status = item.status ?? "available";
      const selected = item.id === this.#selectedId;
      const listItem = document.createElement("li");
      listItem.className = `mhu-cube__item mhu-cube__item--${status}`;
      if (selected) listItem.classList.add("mhu-cube__item--selected");
      const block = layout.get(item.id);
      if (!block) {
        listItem.classList.add("mhu-cube__item--unpositioned");
        listItem.append(createCompactCard(item, this.#axes, this.#compactMetadata));
        list.append(listItem);
        return;
      }

      const { bounds } = block.geometry;
      listItem.classList.add(`mhu-cube__item--card-${block.cardSide}`);
      listItem.style.setProperty("--cube-left", `${bounds.left}%`);
      listItem.style.setProperty("--cube-top", `${bounds.top}%`);
      listItem.style.setProperty("--cube-width", `${bounds.width}%`);
      listItem.style.setProperty("--cube-height", `${bounds.height}%`);
      listItem.style.setProperty("--cube-layer", String(block.layer));
      listItem.style.setProperty("--card-top", `${block.cardTop}%`);
      const button = document.createElement("button");
      button.className = "mhu-cube__select";
      const description = document.createElement("span");
      description.className = "mhu-cube__sr-only";
      description.id = `${this.#instanceId}-item-${index}-description`;
      description.textContent = getAccessibleItemDescription(item, this.#axes);
      this.#configureSelectionButton(button, item, description.id);
      button.append(createBlockShadow(block), createProjectedCube(block.geometry), createPreviewCard(item, this.#hoverMetadata));
      listItem.append(description, button, createCompactCard(item, this.#axes, this.#compactMetadata));
      list.append(listItem);
    });
    this.#plot.append(list);
    const unpositionedItems = this.#items.filter((item) => !layout.has(item.id));
    if (unpositionedItems.length > 0) this.#stage.append(this.#createUnpositionedList(unpositionedItems, itemIndexes));
  }
}

/**
 * Registers the `mhu-cube` custom element once when the Custom Elements API is available.
 * @returns Nothing.
 */
export function defineMhuCube() {
  if (typeof customElements === "undefined") return;
  if (!customElements.get("mhu-cube")) customElements.define("mhu-cube", MhuCube);
}

/** A dataset's availability in the metadata experience. */
export type MhuCubeItemStatus = "available" | "current" | "unavailable";

/** A donor-age span in time-axis units. A single age uses the same start and end. */
export interface MhuCubeTimeRange {
  /** Earliest value, inclusive. */
  start: number;
  /** Latest value, inclusive; equal to start for a single age. */
  end: number;
  /** Optional display text, such as "4–5 months", used instead of the formatted numbers. */
  label?: string;
}

/** Where a dataset is plotted, referencing axis values by name rather than index. */
export interface MhuCubePosition {
  /** Donor-age span drawn as the block's vertical extent. */
  time: MhuCubeTimeRange;
  /** One of `axes.space.values`. */
  space: string;
  /** One of `axes.organ.values`. */
  organ: string;
}

/** A categorical axis displayed by the desktop visualization. */
export interface MhuCubeCategoryAxis {
  /** Human-readable axis name. */
  label: string;
  /** Unique category labels. */
  values: string[];
}

/** The continuous vertical axis measuring donor age. */
export interface MhuCubeTimeAxis {
  /** Human-readable axis name. */
  label: string;
  /** Optional unit shown with the axis title and formatted ranges, such as "years". */
  unit?: string;
  /** Lowest plotted value. */
  min: number;
  /** Highest plotted value; must be greater than `min`. */
  max: number;
  /** Optional labeled values; defaults to five equal steps from `min` to `max`. */
  ticks?: number[];
}

/** The time, space, and organ axes required by the desktop visualization. */
export interface MhuCubeAxes {
  /** Vertical axis; blocks span their dataset's time range. */
  time: MhuCubeTimeAxis;
  /** Categorical spatial scale, displayed in the order provided. */
  space: MhuCubeCategoryAxis;
  /** Categorical tissue source, always displayed alphabetically. */
  organ: MhuCubeCategoryAxis;
}

/** A metadata value: text, a number, or a list such as several author names. */
export type MhuCubeMetadataValue = string | number | string[] | null | undefined;

/** A dataset displayed as a block or compact card. */
export interface MhuCubeItem {
  /** Stable, unique dataset identity. */
  id: string;
  /** Human-readable dataset name. */
  label: string;
  /** Relative, hash, HTTP, or HTTPS metadata destination. */
  href?: string;
  /** Ordered label-value pairs displayed as dataset details; list values show one entry per line on compact cards. */
  metadata?: Record<string, MhuCubeMetadataValue>;
  /** Relative, HTTP, or HTTPS URL of a square preview image with a transparent background, shown on compact cards. */
  image?: string;
  /** Optional plot position; omitted datasets remain available but unplotted. */
  position?: MhuCubePosition;
  /** Availability state; defaults to available when a valid destination exists. */
  status?: MhuCubeItemStatus;
}

/** Detail emitted when a desktop selection changes. */
export interface MhuCubeSelectionDetail {
  item: MhuCubeItem | null;
}

export type MhuCubeValidationSeverity = "error" | "warning";

/** One actionable problem found while normalizing component input. */
export interface MhuCubeValidationIssue {
  code: string;
  message: string;
  path: string;
  severity: MhuCubeValidationSeverity;
  itemId?: string;
}

/** Detail emitted after connected configuration changes are coalesced. */
export interface MhuCubeValidationDetail {
  issues: readonly MhuCubeValidationIssue[];
}

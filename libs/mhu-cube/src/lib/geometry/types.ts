/** A two-dimensional screen point or direction, usually in plot percentages. */
export interface Point {
  x: number;
  y: number;
}

/** A normalized floor position as [x, z]. */
export type FloorPosition = readonly [x: number, z: number];

/** A block's floor corners named by where they sit relative to the camera. */
export interface NearCorners {
  /** The corner nearest the camera. */
  front: FloorPosition;
  /** The corner across the space axis from `front`. */
  left: FloorPosition;
  /** The corner across the organ axis from `front`. */
  right: FloorPosition;
  /** The corner farthest from the camera. */
  back: FloorPosition;
}

/** A projected cube edge that carries axis labels, with the direction pointing away from the cube. */
export interface AxisEdge {
  /** The edge's projected start, at the axis minimum. */
  start: Point;
  /** The edge's projected end, at the axis maximum. */
  end: Point;
  /** Unit screen direction perpendicular to the edge, pointing away from the cube. */
  normal: Point;
}

/** Normalized block extents where x is space (inverted), y is time, and z is organ. */
export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

/**
 * Projected block corners: `front` is the corner nearest the camera, `left` sits across the space axis from it,
 * and `right` across the organ axis. The faces meeting at `front` are visible.
 */
export interface ProjectedBoxGeometry {
  corners: {
    topFront: Point;
    topLeft: Point;
    topBack: Point;
    topRight: Point;
    bottomFront: Point;
    bottomLeft: Point;
    bottomRight: Point;
  };
  bounds: { left: number; top: number; width: number; height: number };
}

/** Placement, paint order, reference lines, and hover-card anchoring for one plotted dataset. */
export interface PlotLayout {
  box: Box;
  /** The dataset's exact normalized time span, which single ages and short ranges draw larger than. */
  time: { start: number; end: number };
  geometry: ProjectedBoxGeometry;
  /** The block's footprint on the floor. */
  floor: Point[];
  /** Lines from the block's visible bottom corners down to the floor; empty when it rests on the floor. */
  drops: [Point, Point][];
  /** Level lines tracing the exact start and end heights from the block to the time axis. */
  leaders: Point[][];
  /** The exact time span marked on the time axis. */
  bracket: [Point, Point];
  /** Paint order starting at one; higher values render in front. */
  layer: number;
  /** Side of the block where its hover card opens. */
  cardSide: 'left' | 'right';
  /** Vertical hover-card anchor as a percentage of the block's bounds. */
  cardTop: number;
}

/** Where each category sits on the floor and how much room its blocks have. */
export interface AxisLayout {
  /** Half of a full-width block's normalized footprint. */
  halfSize: number;
  /** Normalized x center for each space value, in axis order. */
  space: number[];
  /** Normalized z center for each organ value, in axis order. */
  organ: number[];
  /** Normalized z range each organ value's lanes may occupy, in axis order. */
  organBands: [number, number][];
}

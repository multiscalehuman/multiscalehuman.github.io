export { MHU_CUBE_SELECTION_EVENT, MHU_CUBE_VALIDATION_EVENT } from './lib/element/events';
export { MhuCube, defineMhuCube } from './lib/element/mhu-cube';

export {
  type MhuCubeAxes,
  type MhuCubeCategoryAxis,
  type MhuCubeItem,
  type MhuCubeItemStatus,
  type MhuCubeMetadataValue,
  type MhuCubePosition,
  type MhuCubeSelectionDetail,
  type MhuCubeTimeAxis,
  type MhuCubeTimeRange,
  type MhuCubeValidationDetail,
  type MhuCubeValidationIssue,
  type MhuCubeValidationSeverity,
} from './lib/types';

export { validateAxes } from './lib/validation/axes';
export { validateItems } from './lib/validation/items';
export { isSafeMetadataHref, validateCompactMetadata, validateHoverMetadata } from './lib/validation/metadata';
export { type ValidationResult } from './lib/validation/primitives';

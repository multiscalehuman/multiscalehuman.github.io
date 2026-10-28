export { MHU_CUBE_SELECTION_EVENT, MHU_CUBE_VALIDATION_EVENT, MhuCube, defineMhuCube } from './lib/mhu-cube';

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

export {
  isSafeMetadataHref,
  validateAxes,
  validateCompactMetadata,
  validateHoverMetadata,
  validateItems,
  type ValidationResult,
} from './lib/validation';

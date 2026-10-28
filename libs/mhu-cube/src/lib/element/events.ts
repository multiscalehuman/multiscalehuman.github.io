import type { MhuCubeSelectionDetail, MhuCubeValidationDetail } from '../types';
import type { MhuCube } from './mhu-cube';

/** Event dispatched when the desktop selection changes; its detail holds the selected item or null. */
export const MHU_CUBE_SELECTION_EVENT = 'mhu-cube-selection-change';
/** Event dispatched after configuration changes; its detail lists every current validation issue. */
export const MHU_CUBE_VALIDATION_EVENT = 'mhu-cube-validation';

declare global {
  interface HTMLElementTagNameMap {
    'mhu-cube': MhuCube;
  }

  interface GlobalEventHandlersEventMap {
    'mhu-cube-selection-change': CustomEvent<MhuCubeSelectionDetail>;
    'mhu-cube-validation': CustomEvent<MhuCubeValidationDetail>;
  }
}

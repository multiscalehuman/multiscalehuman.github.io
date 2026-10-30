import { Component } from '@angular/core';
import { Notice } from '@atlasng/design-system/indicators/notice';
import { HraEui } from './hra-eui/hra-eui';

/**
 * Homepage section "3D Human Body Visualization": a centered intro and the embedded HRA Exploration User Interface.
 * Below the medium breakpoint, a notice recommends a larger screen.
 */
@Component({
  selector: 'mhu-body-visualization',
  imports: [HraEui, Notice],
  templateUrl: './body-visualization.html',
  styleUrl: './body-visualization.scss',
})
export class BodyVisualization {}

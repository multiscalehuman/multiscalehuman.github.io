import { ApplicationConfig, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideAnalytics, withGlobalErrorHandler } from '@atlasng/analytics';
import { withDefaultBackend } from '@atlasng/analytics/default-backend';
import { provideLinkHandler, withRouterHandler } from '@atlasng/common';
import { provideContentBlocks, withDefinitions } from '@atlasng/content-blocks';
import { DESIGN_SYSTEM_DEFINITIONS } from '@atlasng/content-blocks/definitions/design-system';
import { provideSocialMediaButtons } from '@atlasng/design-system/buttons/social-media-button';
import { defineMhuCube } from '@mhu/mhu-cube';
import { appRoutes } from './app.routes';
import { PORTAL_DEFINITIONS } from './content-blocks/definitions';
import { SOCIAL_MEDIA_DEFS } from './social-media';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(defineMhuCube),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    provideLinkHandler(withRouterHandler()),
    provideContentBlocks({}, withDefinitions(DESIGN_SYSTEM_DEFINITIONS), withDefinitions(PORTAL_DEFINITIONS)),
    provideSocialMediaButtons(SOCIAL_MEDIA_DEFS),
    provideAnalytics(
      { appName: 'multiscalehuman' },
      withGlobalErrorHandler(),
      withDefaultBackend({
        endpoint: `https://cns.iu.edu/tr-mhu${isDevMode() ? '-dev' : ''}`,
      }),
    ),
  ],
};

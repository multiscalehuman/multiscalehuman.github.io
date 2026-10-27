import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
// import { provideAnalytics, withGlobalErrorHandler } from '@atlasng/analytics';
// import { withDefaultBackend } from '@atlasng/analytics/default-backend';
import { provideLinkHandler, withRouterHandler } from '@atlasng/common';
import { provideSocialMediaButtons } from '@atlasng/design-system/buttons/social-media-button';
import { appRoutes } from './app.routes';
import { SOCIAL_MEDIA_DEFS } from './social-media';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    provideLinkHandler(withRouterHandler()),
    provideSocialMediaButtons(SOCIAL_MEDIA_DEFS),
    // provideAnalytics(
    //   { appName: 'multiscalehuman-portal' },
    //   withGlobalErrorHandler(),
    //   withDefaultBackend({
    //     endpoint: 'https://api.atlasng.dev/t',
    //   }),
    // ),
  ],
};

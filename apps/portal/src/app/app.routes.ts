import { Route } from '@angular/router';
import { NotFoundPage } from '@atlasng/design-system/error-page';
import { HomePage } from './pages/home-page/home-page';
import { PrivacyPolicyPage } from './pages/privacy-policy-page/privacy-policy-page';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    component: HomePage,
    title: 'CIFAR MacMillan Multiscale Human Data Portal',
  },
  {
    path: 'privacy-policy',
    component: PrivacyPolicyPage,
    title: 'Privacy Policy | Multiscale Human Data Portal',
  },
  {
    path: '**',
    component: NotFoundPage,
    title: 'Page Not Found | Multiscale Human Data Portal',
  },
];

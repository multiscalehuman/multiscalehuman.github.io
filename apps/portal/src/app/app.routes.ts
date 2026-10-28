import { inject } from '@angular/core';
import { ResolveFn, Route } from '@angular/router';
import { NotFoundPage } from '@atlasng/design-system/error-page';
import { DatasetService } from './datasets/datasets';
import { HomePage } from './pages/home-page/home-page';
import { DatasetMetadata } from './pages/metadata-page/dataset-metadata';
import { MetadataPage } from './pages/metadata-page/metadata-page';
import { PrivacyPolicyPage } from './pages/privacy-policy-page/privacy-policy-page';

export const datasetResolver: ResolveFn<DatasetMetadata> = (route) => {
  const id = route.paramMap.get('datasetId') ?? '';
  return inject(DatasetService).getDataset(id);
};

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    component: HomePage,
    title: 'CIFAR MacMillan Multiscale Human Data Portal',
  },
  {
    path: 'datasets/:datasetId',
    component: MetadataPage,
    resolve: {
      metadata: datasetResolver,
    },
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

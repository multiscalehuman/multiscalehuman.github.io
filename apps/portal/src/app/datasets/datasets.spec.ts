import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  convertToParamMap,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { DatasetMetadata } from '../pages/metadata-page/dataset-metadata';
import { datasetResolver, Datasets } from './datasets';

describe('Datasets', () => {
  const heart = { organ: 'Heart' } as DatasetMetadata;
  let service: Datasets;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(Datasets);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads a dataset from the JSON file with the same name', async () => {
    const result = firstValueFrom(service.getDataset('heart-100um'));
    httpTesting.expectOne('assets/datasets/heart-100um.json').flush(heart);

    expect(await result).toEqual(heart);
  });

  it('errors when the dataset file is missing', async () => {
    const result = firstValueFrom(service.getDataset('unknown'));
    httpTesting.expectOne('assets/datasets/unknown.json').flush('', { status: 404, statusText: 'Not Found' });

    await expect(result).rejects.toMatchObject({ status: 404 });
  });
});

describe('datasetResolver', () => {
  const heart = { organ: 'Heart' } as DatasetMetadata;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  function resolve(params: Record<string, string>) {
    const route = { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
    return firstValueFrom(
      TestBed.runInInjectionContext(
        () => datasetResolver(route, {} as RouterStateSnapshot) as Observable<DatasetMetadata | RedirectCommand>,
      ),
    );
  }

  function expectNotFoundRedirect(result: DatasetMetadata | RedirectCommand) {
    const router = TestBed.inject(Router);

    expect(result).toBeInstanceOf(RedirectCommand);
    const redirect = result as RedirectCommand;
    expect(router.serializeUrl(redirect.redirectTo)).toBe('/not-found');
    expect(redirect.navigationBehaviorOptions).toEqual({ skipLocationChange: true });
  }

  it('resolves the dataset named by the route', async () => {
    const result = resolve({ datasetId: 'heart-100um' });
    httpTesting.expectOne('assets/datasets/heart-100um.json').flush(heart);

    expect(await result).toEqual(heart);
  });

  it('redirects to the not-found page for an unknown dataset', async () => {
    const result = resolve({ datasetId: 'unknown' });
    httpTesting.expectOne('assets/datasets/unknown.json').flush('', { status: 404, statusText: 'Not Found' });

    expectNotFoundRedirect(await result);
  });

  it('redirects to the not-found page when the dataset fails to load', async () => {
    const result = resolve({ datasetId: 'heart-100um' });
    httpTesting.expectOne('assets/datasets/heart-100um.json').error(new ProgressEvent('error'));

    expectNotFoundRedirect(await result);
  });

  it('redirects to the not-found page when the route has no dataset ID', async () => {
    const result = resolve({});
    httpTesting.expectOne('assets/datasets/.json').flush('', { status: 404, statusText: 'Not Found' });

    expectNotFoundRedirect(await result);
  });
});

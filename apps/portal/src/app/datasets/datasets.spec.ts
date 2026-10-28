import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DatasetMetadata } from '../pages/metadata-page/dataset-metadata';
import { DatasetService } from './datasets';

describe('DatasetService', () => {
  const heart = { organ: 'Heart' } as DatasetMetadata;
  let service: DatasetService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DatasetService);
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

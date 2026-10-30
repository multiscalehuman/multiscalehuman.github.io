import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Observable } from 'rxjs';
import { DatasetMetadata } from '../pages/metadata-page/dataset-metadata';

/** Loads dataset metadata from `assets/datasets`. Each dataset is requested at most once and then cached. */
@Service()
export class Datasets {
  /** HTTP client used to fetch dataset files. */
  private readonly http = inject(HttpClient);

  /**
   * Loads the dataset stored in `assets/datasets/<id>.json`.
   * Failed requests are not cached, so a later call retries.
   * @param id Dataset ID
   * @returns Dataset metadata; errors when the file is missing or cannot be loaded
   */
  getDataset(id: string): Observable<DatasetMetadata> {
    return this.http.get<DatasetMetadata>(`assets/datasets/${id}.json`);
  }
}

/**
 * Resolves the dataset named by the route's `datasetId` parameter.
 * @param route Activated route snapshot
 * @returns Dataset metadata for the route
 */
export const datasetResolver: ResolveFn<DatasetMetadata> = (route) => {
  const id = route.paramMap.get('datasetId') ?? '';
  return inject(Datasets).getDataset(id);
};

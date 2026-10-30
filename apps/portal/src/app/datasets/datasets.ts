import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { DatasetMetadata } from '../pages/metadata-page/dataset-metadata';

/** Loads dataset metadata from `assets/datasets`. */
@Service()
export class Datasets {
  /** HTTP client used to fetch dataset files. */
  private readonly http = inject(HttpClient);

  /**
   * Loads the dataset stored in `assets/datasets/<id>.json`.
   * @param id Dataset ID
   * @returns Dataset metadata; errors when the file is missing or cannot be loaded
   */
  getDataset(id: string): Observable<DatasetMetadata> {
    return this.http.get<DatasetMetadata>(`assets/datasets/${id}.json`);
  }
}

/** Path that matches no route, so the wildcard route renders the not-found page. */
const NOT_FOUND_PATH = '/not-found';

/**
 * Resolves the dataset named by the route's `datasetId` parameter.
 * @param route Activated route snapshot
 * @returns Dataset metadata for the route; when the parameter is missing, names no dataset, or the file fails to
 *   load, a redirect to the not-found page that keeps the requested URL in the address bar
 */
export const datasetResolver: ResolveFn<DatasetMetadata> = (route) => {
  const router = inject(Router);
  const id = route.paramMap.get('datasetId') ?? '';
  return inject(Datasets)
    .getDataset(id)
    .pipe(catchError(() => of(new RedirectCommand(router.parseUrl(NOT_FOUND_PATH), { skipLocationChange: true }))));
};

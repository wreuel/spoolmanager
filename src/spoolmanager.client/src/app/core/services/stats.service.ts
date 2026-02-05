import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { StatsSummary } from '../../../models/domain/StatsSummary';
import { BaseApiService } from './base-api.service';
import { API_BASE_URL } from '../tokens/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class StatsService extends BaseApiService {
  constructor(http: HttpClient, @Inject(API_BASE_URL) baseUrl: string) {
    super(http, baseUrl);
  }

  getSummary(): Observable<StatsSummary> {
    return this.get<StatsSummary>('stats/summary');
  }
}

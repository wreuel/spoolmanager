import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { FilamentCreate } from '../../models/Dto/FilamentCreate';
import { Filament } from '../../models/domain/Filament';
import { BaseApiService } from '../core/services/base-api.service';
import { API_BASE_URL } from '../core/tokens/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class FilamentService extends BaseApiService {
  constructor(http: HttpClient, @Inject(API_BASE_URL) baseUrl: string) {
    super(http, baseUrl);
  }

  createFilament(payload: FilamentCreate): Observable<Filament> {
    return this.post<Filament>('filament', payload);
  }

  listFilaments(): Observable<Filament[]> {
    return this.get<Filament[]>('filament/list');
  }
}

import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../core/services/base-api.service';
import { API_BASE_URL } from '../core/tokens/api-base-url.token';
import { Spool } from '../../models/domain/Spool';
import { SpoolCreate } from '../../models/Dto/SpoolCreate';
import { SpoolEdit } from '../../models/Dto/SpoolEdit';
import { SpoolmanFilament } from '../../models/external/SpoolmanFilament';

@Injectable({ providedIn: 'root' })
export class SpoolService extends BaseApiService {
  constructor(http: HttpClient, @Inject(API_BASE_URL) baseUrl: string) {
    super(http, baseUrl);
  }

  listSpools(): Observable<Spool[]> {
    return this.get<Spool[]>('spool/list');
  }

  getSpool(id: number): Observable<Spool> {
    return this.get<Spool>(`spool/${id}`);
  }

  createSpool(payload: Partial<SpoolCreate>): Observable<Spool> {
    return this.post<Spool>('spool', payload);
  }

  updateSpool(id: number, payload: Partial<SpoolEdit>): Observable<Spool> {
    return this.put<Spool>(`spool/${id}`, payload);
  }

  listExternalFilaments(): Observable<SpoolmanFilament[]> {
    return this.get<SpoolmanFilament[]>('spoolmandb/filaments');
  }
}

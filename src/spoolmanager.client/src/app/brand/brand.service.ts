import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BrandCreate } from '../../models/Dto/BrandCreate';
import { BrandEdit } from '../../models/Dto/BrandEdit';
import { Brand } from '../../models/domain/Brand';
import { BaseApiService } from '../core/services/base-api.service';
import { API_BASE_URL } from '../core/tokens/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class BrandService extends BaseApiService {
  constructor(http: HttpClient, @Inject(API_BASE_URL) baseUrl: string) {
    super(http, baseUrl);
  }

  createBrand(payload: BrandCreate): Observable<Brand> {
    return this.post<Brand>('brand', payload);
  }

  listBrands(): Observable<Brand[]> {
    return this.get<Brand[]>('brand/list');
  }

  updateBrand(id: number, payload: BrandEdit): Observable<Brand> {
    return this.put<Brand>(`brand/${id}`, payload);
  }
}

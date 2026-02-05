import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../core/services/base-api.service';
import { API_BASE_URL } from '../core/tokens/api-base-url.token';
import { PrintJob } from '../../models/domain/PrintJob';
import { PrintJobCreate } from '../../models/Dto/PrintJobCreate';

@Injectable({ providedIn: 'root' })
export class PrintJobService extends BaseApiService {
  constructor(http: HttpClient, @Inject(API_BASE_URL) baseUrl: string) {
    super(http, baseUrl);
  }

  listPrintJobs(): Observable<PrintJob[]> {
    return this.get<PrintJob[]>('printjobs/list');
  }

  createPrintJob(payload: PrintJobCreate): Observable<PrintJob> {
    return this.post<PrintJob>('printjobs/create', payload);
  }
}

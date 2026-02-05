import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../tokens/api-base-url.token';

export interface ApiRequestOptions {
  headers?: HttpHeaders;
}

export abstract class BaseApiService {
  protected constructor(
    protected readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  protected get<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.get<T>(this.buildUrl(path), this.createRequestOptions(options));
  }

  protected post<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.post<T>(this.buildUrl(path), body, this.createRequestOptions(options));
  }

  protected put<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.put<T>(this.buildUrl(path), body, this.createRequestOptions(options));
  }

  protected buildUrl(path: string): string {
    if (!path) {
      return this.apiBaseUrl;
    }

    const normalizedBase = this.apiBaseUrl.endsWith('/') ? this.apiBaseUrl : `${this.apiBaseUrl}/`;
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    return `${normalizedBase}${normalizedPath}`;
  }

  protected createDefaultHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.getAuthToken();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  protected getAuthToken(): string | null {
    return null;
  }

  private createRequestOptions(options?: ApiRequestOptions) {
    const defaultHeaders = this.createDefaultHeaders();
    const headers = options?.headers
      ? options.headers.keys().reduce((acc, key) => acc.set(key, options.headers!.get(key) as string), defaultHeaders)
      : defaultHeaders;

    return { ...options, headers };
  }
}

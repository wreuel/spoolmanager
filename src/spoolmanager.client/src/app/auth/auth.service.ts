import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

import { BaseApiService } from '../core/services/base-api.service';
import { LoginRequest } from '../../models/Dto/LoginRequest';
import { LoginResponse } from '../../models/Dto/LoginResponse';
import { RefreshTokenResponse } from '../../models/Dto/RefreshTokenResponse';
import { API_BASE_URL } from '../core/tokens/api-base-url.token';
import { AuthStateService } from './auth-state.service';

@Injectable({ providedIn: 'root' })
export class AuthService extends BaseApiService {
  constructor(
    http: HttpClient,
    @Inject(API_BASE_URL) baseUrl: string,
    private readonly authState: AuthStateService
  ) {
    super(http, baseUrl);
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.post<LoginResponse>('user/login', request).pipe(
      tap((response) => {
        this.authState.setSession(response.token, response.refreshToken, request.username);
      })
    );
  }

  refreshTokens(): Observable<RefreshTokenResponse> {
    const refreshToken = this.authState.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    return this.post<RefreshTokenResponse>('user/refresh', { token: refreshToken }).pipe(
      tap((response) => {
        this.authState.setSession(response.token, response.refreshToken);
      })
    );
  }

  logout(): Observable<void> {
    const refreshToken = this.authState.getRefreshToken();

    if (!refreshToken) {
      this.authState.clearSession();
      return of(void 0);
    }

    return this.post<void>('user/logout', { token: refreshToken }).pipe(
      finalize(() => this.authState.clearSession())
    );
  }
}

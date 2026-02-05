import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, shareReplay, switchMap } from 'rxjs/operators';

import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';
import { RefreshTokenResponse } from '../../models/Dto/RefreshTokenResponse';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshStream$?: Observable<RefreshTokenResponse>;

  constructor(private readonly authState: AuthStateService, private readonly authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authRequest = this.appendToken(req);

    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.isAuthEndpoint(req.url) && this.authState.getRefreshToken()) {
          return this.handleUnauthorized(authRequest, next);
        }

        return throwError(() => error);
      })
    );
  }

  private appendToken(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = this.authState.getAccessToken();
    if (!token || this.isAuthEndpoint(req.url)) {
      return req;
    }

    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handleUnauthorized(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return this.getRefreshStream().pipe(
      switchMap((response) => {
        return next.handle(
          req.clone({
            setHeaders: {
              Authorization: `Bearer ${response.token}`
            }
          })
        );
      }),
      catchError((refreshError) => {
        this.authState.clearSession();
        return throwError(() => refreshError);
      })
    );
  }

  private getRefreshStream(): Observable<RefreshTokenResponse> {
    if (!this.refreshStream$) {
      this.refreshStream$ = this.authService.refreshTokens().pipe(
        finalize(() => {
          this.refreshStream$ = undefined;
        }),
        shareReplay(1)
      );
    }

    return this.refreshStream$;
  }

  private isAuthEndpoint(url: string): boolean {
    return /\/user\/(login|refresh|register|logout)/i.test(url);
  }
}

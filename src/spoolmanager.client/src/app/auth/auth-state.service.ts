import { Injectable, computed, signal } from '@angular/core';

interface AuthSessionState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  username: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private static readonly storageKey = 'sm-auth-session';
  private readonly session = signal<AuthSessionState>(this.restoreSession());

  readonly isAuthenticated = computed(() => {
    const snapshot = this.session();
    if (!snapshot.token || !snapshot.refreshToken) {
      return false;
    }

    if (!snapshot.expiresAt) {
      return true;
    }

    return snapshot.expiresAt > Date.now();
  });

  readonly username = computed(() => this.session().username);

  setSession(token: string, refreshToken: string, username?: string | null): void {
    const expiresAt = this.extractExpiration(token);
    const next: AuthSessionState = {
      token,
      refreshToken,
      expiresAt,
      username: username ?? this.session().username
    };

    this.session.set(next);
    this.persistSession(next);
  }

  clearSession(): void {
    const empty: AuthSessionState = {
      token: null,
      refreshToken: null,
      expiresAt: null,
      username: null
    };

    this.session.set(empty);
    this.removePersistedSession();
  }

  getAccessToken(): string | null {
    const snapshot = this.session();
    if (!snapshot.token || (snapshot.expiresAt && snapshot.expiresAt <= Date.now())) {
      return null;
    }

    return snapshot.token;
  }

  getRefreshToken(): string | null {
    return this.session().refreshToken;
  }

  shouldRefresh(bufferSeconds = 60): boolean {
    const expiresAt = this.session().expiresAt;
    if (!expiresAt) {
      return false;
    }

    return expiresAt - Date.now() <= bufferSeconds * 1000;
  }

  private restoreSession(): AuthSessionState {
    if (typeof window === 'undefined') {
      return { token: null, refreshToken: null, expiresAt: null, username: null };
    }

    try {
      const raw = window.localStorage.getItem(AuthStateService.storageKey);
      if (!raw) {
        return { token: null, refreshToken: null, expiresAt: null, username: null };
      }

      const parsed = JSON.parse(raw) as AuthSessionState;
      const expiresAt = parsed.token ? this.extractExpiration(parsed.token) : null;

      if (expiresAt && expiresAt <= Date.now()) {
        return {
          token: null,
          refreshToken: parsed.refreshToken,
          expiresAt: null,
          username: parsed.username ?? null
        };
      }

      return {
        token: parsed.token,
        refreshToken: parsed.refreshToken,
        expiresAt,
        username: parsed.username ?? null
      };
    } catch {
      return { token: null, refreshToken: null, expiresAt: null, username: null };
    }
  }

  private persistSession(state: AuthSessionState): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(AuthStateService.storageKey, JSON.stringify(state));
    } catch {
      // ignore persistence failures
    }
  }

  private removePersistedSession(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.removeItem(AuthStateService.storageKey);
    } catch {
      // ignore removal failures
    }
  }

  private extractExpiration(token: string): number | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) {
        return null;
      }

      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const parsed = JSON.parse(decoded) as { exp?: number };
      return parsed?.exp ? parsed.exp * 1000 : null;
    } catch {
      return null;
    }
  }
}

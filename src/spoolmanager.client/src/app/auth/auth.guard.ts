import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthStateService } from './auth-state.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private readonly authState: AuthStateService, private readonly router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.evaluate(state.url);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.evaluate(state.url);
  }

  private evaluate(redirectUrl: string): boolean | UrlTree {
    if (this.authState.isAuthenticated()) {
      return true;
    }

    return this.router.createUrlTree(['/login'], {
      queryParams: { returnUrl: redirectUrl }
    });
  }
}

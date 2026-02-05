import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly title = 'Spool Manager';
  readonly sidebarCollapsed = signal(false);
  readonly theme = signal<'light' | 'dark'>(this.detectInitialTheme());
  readonly isAuthRoute = signal(this.router.url.startsWith('/login'));
  readonly navItems = [
    { label: 'Home', route: '/', icon: 'home' },
    { label: 'Brands', route: '/brands', icon: 'grid' },
    { label: 'Filaments', route: '/filaments', icon: 'layers' },
    { label: 'Spools', route: '/spools', icon: 'spool' },
    { label: 'Print Jobs', route: '/print-jobs', icon: 'printer' }
  ];

  readonly navIcons: Record<string, string> = {
    home: 'M3 11.5 12 3l9 8.5h-3V21h-5v-4h-2v4H6v-9.5z',
    grid: 'M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z',
    layers: 'M4 9l8-4 8 4-8 4zm0 6l8 4 8-4M4 12l8 4 8-4',
    spool: 'M4 7a3 3 0 013-3h10a3 3 0 013 3v1a3 3 0 01-3 3h-3v4h3a3 3 0 013 3v1a3 3 0 01-3 3H7a3 3 0 01-3-3v-1a3 3 0 013-3h3V11H7a3 3 0 01-3-3z',
    printer: 'M6 4h12v4h2a2 2 0 012 2v6h-4v4H8v-4H4v-6a2 2 0 012-2h0zm2 12v2h8v-2zM6 8h12V6H6z'
  };

  constructor() {
    this.applyTheme(this.theme());
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isAuthRoute.set(event.urlAfterRedirects.startsWith('/login'));
      });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  toggleTheme(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    this.applyTheme(next);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  private detectInitialTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const stored = window.localStorage.getItem('sm-theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sm-theme', theme);
    }
  }
}

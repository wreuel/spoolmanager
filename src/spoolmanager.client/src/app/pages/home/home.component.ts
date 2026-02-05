import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StatsSummary } from '../../../models/domain/StatsSummary';
import { StatsService } from '../../core/services/stats.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly statsService = inject(StatsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly summary = signal<StatsSummary | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly metrics = computed(() => {
    const data = this.summary();
    if (!data) {
      return [];
    }

    return [
      { label: 'Spools', value: data.spoolCount, accent: 'spools', route: '/spools' },
      { label: 'Print jobs', value: data.printJobCount, accent: 'prints', route: '/print-jobs' },
      { label: 'Filaments', value: data.filamentCount, accent: 'filaments', route: '/filaments' },
      { label: 'Brands', value: data.brandCount, accent: 'brands', route: '/brands' }
    ];
  });

  constructor() {
    this.loadSummary();
  }

  protected refresh(): void {
    this.loadSummary();
  }

  private loadSummary(): void {
    this.status.set('loading');
    this.errorMessage.set(null);

    this.statsService
      .getSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.status.set('ready');
      },
      error: (error) => {
        this.status.set('error');
        this.errorMessage.set(this.resolveErrorMessage(error));
      }
      });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const serverError = error.error as { error?: string; message?: string } | null;
      return serverError?.error ?? serverError?.message ?? 'Unable to load stats.';
    }

    return 'Unable to load stats.';
  }
}

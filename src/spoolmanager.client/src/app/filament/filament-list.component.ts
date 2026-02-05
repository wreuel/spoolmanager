import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FilamentService } from './filament.service';
import { Filament } from '../../models/domain/Filament';

@Component({
  selector: 'app-filament-list',
  templateUrl: './filament-list.component.html',
  styleUrl: './filament-list.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilamentListComponent {
  private readonly filamentService = inject(FilamentService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly filaments = signal<Filament[]>([]);
  protected readonly colorFilter = signal<'all' | 'single' | 'multi'>('all');
  protected readonly filteredFilaments = computed(() => {
    const filter = this.colorFilter();
    const items = this.filaments();

    if (filter === 'all') {
      return items;
    }

    return items.filter((filament) =>
      filter === 'multi' ? this.isMultiColor(filament) : !this.isMultiColor(filament)
    );
  });

  constructor() {
    this.loadFilaments();
  }

  refresh(): void {
    this.loadFilaments();
  }

  protected setColorFilter(filter: 'all' | 'single' | 'multi'): void {
    this.colorFilter.set(filter);
  }

  protected isMultiColor(filament: Filament): boolean {
    return Boolean(filament.multiColorHexes && filament.multiColorHexes.trim().length > 0);
  }

  protected colorPalette(filament: Filament): string[] {
    if (this.isMultiColor(filament)) {
      return filament.multiColorHexes
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map(v => v.startsWith('#') ? v : `#${v}`);
    }
    console.log(filament.id, filament.colorHex);
     return filament.colorHex
    ? [filament.colorHex.startsWith('#') ? filament.colorHex : `#${filament.colorHex}`]
    : [];
  }

  protected formattedTemps(values: number[] | undefined | null): string {
    if (!values || values.length === 0) {
      return '—';
    }

    if (values.length === 1) {
      return `${values[0]}°C`;
    }

    const sorted = [...values].sort((a, b) => a - b);
    return `${sorted[0]}–${sorted[sorted.length - 1]}°C`;
  }

  protected formattedWeight(value: number, suffix = 'g'): string {
    return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}${suffix}`;
  }

  protected formattedPrice(value: number): string {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD'
    }).format(Number(value));
  }

  protected trackByFilament = (_: number, filament: Filament) => filament.id;

  private loadFilaments(): void {
    this.status.set('loading');
    this.errorMessage.set(null);

    this.filamentService
      .listFilaments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (filaments) => {
          this.filaments.set(filaments);
          this.status.set('ready');
        },
        error: (error: unknown) => {
          this.status.set('error');
          const fallback = 'Unable to load filaments right now.';
          if (error && typeof error === 'object' && 'error' in error) {
            const serverError = (error as { error?: { error?: string; message?: string } }).error;
            this.errorMessage.set(serverError?.error ?? serverError?.message ?? fallback);
            return;
          }

          this.errorMessage.set((error as { message?: string })?.message ?? fallback);
        }
      });
  }
}

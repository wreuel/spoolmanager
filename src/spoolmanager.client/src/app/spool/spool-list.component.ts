import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Filament } from '../../models/domain/Filament';
import { Spool } from '../../models/domain/Spool';
import { SpoolEdit } from '../../models/Dto/SpoolEdit';
import { SpoolService } from './spool.service';

@Component({
  selector: 'app-spool-list',
  templateUrl: './spool-list.component.html',
  styleUrl: './spool-list.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpoolListComponent {
  private readonly spoolService = inject(SpoolService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly listStatus = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly listError = signal<string | null>(null);
  private readonly sourceSpools = signal<Spool[]>([]);
  protected readonly onlyAvailable = signal(false);

  protected readonly sortBy = signal<SortCriteria>('id');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly spools = computed(() => {
    const criteria = this.sortBy();
    const multiplier = this.sortDirection() === 'asc' ? 1 : -1;
    const onlyAvailable = this.onlyAvailable();
    const data = this.sourceSpools().filter((spool) =>
      onlyAvailable ? this.remaining(spool) > 0 : true
    );

    return data.sort((a, b) => this.compareSpools(a, b, criteria) * multiplier);
  });

  protected readonly editingId = signal<number | null>(null);
  protected readonly editStatus = signal<'idle' | 'saving'>('idle');
  protected readonly editError = signal<string | null>(null);

  protected readonly editForm = this.fb.nonNullable.group({
    price: [0, [Validators.required, Validators.min(0)]],
    initialWeight: [0, [Validators.required, Validators.min(1)]],
    lotNumber: [''],
    location: [''],
    comment: [''],
    firstUsed: ['', Validators.required],
    lastUsed: ['', Validators.required]
  });

  constructor() {
    this.loadSpools();
  }

  refresh(): void {
    this.loadSpools();
  }

  protected changeSort(criteria: SortCriteria): void {
    if (this.sortBy() === criteria) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortBy.set(criteria);
    if (criteria === 'price' || criteria === 'id' || criteria === 'material') {
      this.sortDirection.set('asc');
      return;
    }

    this.sortDirection.set('desc');
  }

  protected isSortActive(criteria: SortCriteria, direction: 'asc' | 'desc'): boolean {
    return this.sortBy() === criteria && this.sortDirection() === direction;
  }

  protected isEditing(spool: Spool): boolean {
    return this.editingId() === spool.id;
  }

  protected startEdit(spool: Spool): void {
    this.editingId.set(spool.id);
    this.editStatus.set('idle');
    this.editError.set(null);
    this.editForm.reset({
      price: spool.price,
      initialWeight: spool.initialWeight,
      lotNumber: spool.lotNumber ?? '',
      location: spool.location ?? '',
      comment: spool.comment ?? '',
      firstUsed: this.toDateInputValue(spool.firstUsed),
      lastUsed: this.toDateInputValue(spool.lastUsed)
    });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editStatus.set('idle');
    this.editError.set(null);
    this.editForm.reset({
      price: 0,
      initialWeight: 0,
      lotNumber: '',
      location: '',
      comment: '',
      firstUsed: '',
      lastUsed: ''
    });
  }

  protected saveEdit(): void {
    const spoolId = this.editingId();
    if (spoolId === null) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();

    const payload: SpoolEdit = {
      price: Number(value.price),
      initialWeight: Number(value.initialWeight),
      lotNumber: value.lotNumber?.trim() ?? '',
      location: value.location?.trim() ?? '',
      comment: value.comment?.trim() ?? '',
      firstUsed: this.toIsoString(value.firstUsed),
      lastUsed: this.toIsoString(value.lastUsed)
    };

    this.editStatus.set('saving');
    this.editError.set(null);

    this.spoolService
      .updateSpool(spoolId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (spool) => {
          this.editStatus.set('idle');
          this.replaceSpool(spool);
          this.cancelEdit();
        },
        error: (error) => {
          this.editStatus.set('idle');
          this.editError.set(this.resolveErrorMessage(error, 'Não foi possível atualizar a bobina.'));
        }
      });
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }

  protected remaining(spool: Spool): number {
    if (typeof spool.remainingGrams === 'number') {
      return spool.remainingGrams;
    }

    const used = spool.printJobSpools?.reduce((total, item) => total + item.gramsUsed, 0) ?? 0;
    return Math.max(spool.initialWeight - used, 0);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(value);
  }

  protected toggleRemainingFilter(): void {
    this.onlyAvailable.update((value) => !value);
  }

  protected spoolColorPalette(spool: Spool): string[] {
    const filament = spool.filament;
    if (!filament) {
      return [];
    }

    if (this.isMultiColorFilament(filament)) {
      return filament.multiColorHexes
        .split(',')
        .map((value) => this.normalizeColorHex(value))
        .filter((value): value is string => Boolean(value));
    }

    const singleColor = this.normalizeColorHex(filament.colorHex);
    return singleColor ? [singleColor] : [];
  }

  protected isSpoolMultiColor(spool: Spool): boolean {
    return this.isMultiColorFilament(spool.filament);
  }

  protected spoolColorDirection(spool: Spool): string | null {
    if (!this.isSpoolMultiColor(spool)) {
      return null;
    }

    return spool.filament?.multiColorDirection || 'Multicolor';
  }

  protected spoolMaterialSummary(spool: Spool): string {
    const filament = spool.filament;
    if (!filament) {
      return '—';
    }

    const parts = [filament.material || '—'];
    if (filament.finish) {
      parts.push(filament.finish);
    }

    return parts.filter(Boolean).join(' · ');
  }

  protected spoolMaterialSpecs(spool: Spool): string | null {
    const filament = spool.filament;
    if (!filament) {
      return null;
    }

    const specs: string[] = [];
    if (typeof filament.diameter === 'number' && filament.diameter > 0) {
      specs.push(`${filament.diameter} mm`);
    }
    if (typeof filament.weightGrams === 'number' && filament.weightGrams > 0) {
      specs.push(`${filament.weightGrams} g`);
    }

    return specs.length > 0 ? specs.join(' · ') : null;
  }

  protected trackBySpool = (_: number, spool: Spool) => spool.id;

  protected sortIndicator(direction: 'asc' | 'desc'): string {
    return direction === 'asc'
      ? 'M858.9 689 530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z'
      : 'M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z';
  }

  private loadSpools(): void {
    this.listStatus.set('loading');
    this.listError.set(null);
    this.editingId.set(null);

    this.spoolService
      .listSpools()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (spools) => {
          console.log('Loaded spools:', spools);
          this.sourceSpools.set(spools);
          this.listStatus.set('ready');
        },
        error: (error) => {
          this.listStatus.set('error');
          this.listError.set(this.resolveErrorMessage(error, 'Não foi possível carregar as bobinas.'));
        }
      });
  }

  private replaceSpool(spool: Spool): void {
    this.sourceSpools.update((items) => items.map((item) => (item.id === spool.id ? spool : item)));
  }

  private toDateInputValue(value?: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  }

  private toIsoString(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const serverError = error.error as { error?: string; message?: string } | null;
      return serverError?.error ?? serverError?.message ?? fallback;
    }

    return fallback;
  }

  private compareSpools(a: Spool, b: Spool, criteria: SortCriteria): number {
    switch (criteria) {
      case 'id':
        return a.id - b.id;
      case 'material':
        return this.materialSortValue(a).localeCompare(this.materialSortValue(b), 'pt-BR');
      case 'price':
        return a.price - b.price;
      case 'remaining':
        return this.remaining(a) - this.remaining(b);
      case 'registered':
        return this.dateValue(a.registered) - this.dateValue(b.registered);
      case 'firstUsed':
        return this.dateValue(a.firstUsed) - this.dateValue(b.firstUsed);
      case 'lastUsed':
        return this.dateValue(a.lastUsed) - this.dateValue(b.lastUsed);
      default:
        return 0;
    }
  }

  private dateValue(value?: string | null): number {
    if (!value) {
      return 0;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private materialSortValue(spool: Spool): string {
    const filament = spool.filament;
    if (!filament) {
      return '';
    }

    const parts: string[] = [];
    if (filament.material) {
      parts.push(filament.material.trim().toLowerCase());
    }
    if (filament.finish) {
      parts.push(filament.finish.trim().toLowerCase());
    }

    return parts.filter(Boolean).join(' ');
  }

  private isMultiColorFilament(filament?: Filament | null): boolean {
    if (!filament?.multiColorHexes) {
      return false;
    }

    return filament.multiColorHexes
      .split(',')
      .some((value) => value.trim().length > 0);
  }

  private normalizeColorHex(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    return normalized.length === 7 ? normalized : normalized.slice(0, 7);
  }
}

type SortCriteria = 'id' | 'material' | 'registered' | 'remaining' | 'price' | 'firstUsed' | 'lastUsed';

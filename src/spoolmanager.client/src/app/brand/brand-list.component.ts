import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BrandEdit } from '../../models/Dto/BrandEdit';
import { Brand } from '../../models/domain/Brand';
import { BrandService } from './brand.service';

@Component({
  selector: 'app-brand-list',
  templateUrl: './brand-list.component.html',
  styleUrl: './brand-list.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandListComponent {
  private readonly brandService = inject(BrandService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly listStatus = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly listError = signal<string | null>(null);
  private readonly sourceBrands = signal<Brand[]>([]);
  protected readonly sortBy = signal<'name' | 'id'>('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly brands = computed(() => {
    const criteria = this.sortBy();
    const direction = this.sortDirection();
    const sorted = [...this.sourceBrands()];
    const multiplier = direction === 'asc' ? 1 : -1;
    return criteria === 'name'
      ? sorted.sort((a, b) => a.name.localeCompare(b.name) * multiplier)
      : sorted.sort((a, b) => (a.id - b.id) * multiplier);
  });

  protected readonly editingId = signal<number | null>(null);
  protected readonly editStatus = signal<'idle' | 'saving'>('idle');
  protected readonly editError = signal<string | null>(null);

  protected readonly editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]]
  });

  constructor() {
    this.loadBrands();
  }

  refresh(): void {
    this.loadBrands();
  }

  protected changeSort(criteria: 'name' | 'id'): void {
    if (this.sortBy() === criteria) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortBy.set(criteria);
    this.sortDirection.set('asc');
  }

  protected sortIndicator(direction: 'asc' | 'desc'): string {
    return direction === 'asc'
      ? 'M858.9 689 530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z'
      : 'M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z';
  }

  protected isSortActive(criteria: 'name' | 'id', direction: 'asc' | 'desc'): boolean {
    return this.sortBy() === criteria && this.sortDirection() === direction;
  }

  protected isEditing(brand: Brand): boolean {
    return this.editingId() === brand.id;
  }

  protected startEdit(brand: Brand): void {
    this.editingId.set(brand.id);
    this.editStatus.set('idle');
    this.editError.set(null);
    this.editForm.reset({ name: brand.name });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editStatus.set('idle');
    this.editError.set(null);
    this.editForm.reset({ name: '' });
  }

  protected saveEdit(): void {
    const brandId = this.editingId();

    if (brandId === null) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const payload: BrandEdit = this.editForm.getRawValue();

    this.editStatus.set('saving');
    this.editError.set(null);

    this.brandService
      .updateBrand(brandId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (brand) => {
          this.editStatus.set('idle');
          this.replaceBrand(brand);
          this.cancelEdit();
        },
        error: (error) => {
          this.editStatus.set('idle');
          this.editError.set(this.resolveErrorMessage(error, 'Unable to update the brand.'));
        }
      });
  }

  protected trackByBrand = (_: number, brand: Brand) => brand.id;

  private loadBrands(): void {
    this.listStatus.set('loading');
    this.listError.set(null);
    this.editingId.set(null);
    this.editForm.reset({ name: '' });

    this.brandService
      .listBrands()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (brands) => {
          this.sourceBrands.set(brands);
          this.listStatus.set('ready');
        },
        error: (error) => {
          this.listStatus.set('error');
          this.listError.set(this.resolveErrorMessage(error, 'Unable to load brands.'));
        }
      });
  }

  private replaceBrand(updated: Brand): void {
    this.sourceBrands.update((brands) =>
      brands.map((brand) => (brand.id === updated.id ? { ...brand, ...updated } : brand))
    );
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const serverError = error.error as { error?: string; message?: string } | null;
      return serverError?.error ?? serverError?.message ?? fallback;
    }

    return fallback;
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, EventEmitter, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FilamentService } from './filament.service';
import { BrandService } from '../brand/brand.service';
import { Brand } from '../../models/domain/Brand';
import { Filament } from '../../models/domain/Filament';
import { FilamentCreate } from '../../models/Dto/FilamentCreate';
import { Router } from '@angular/router';

type ColorMode = 'single' | 'multi';
type MultiColorDirection = 'coextrusada' | 'longitudinal';

@Component({
  selector: 'app-filament-create',
  templateUrl: './filament-create.component.html',
  styleUrl: './filament-create.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilamentCreateComponent {
  private readonly filamentService = inject(FilamentService);
  private readonly brandService = inject(BrandService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('brandSearchInput') private brandSearchInput?: ElementRef<HTMLInputElement>;
  private brandDropdownCloseHandle: ReturnType<typeof setTimeout> | null = null;

  @Output() readonly filamentCreated = new EventEmitter<Filament>();

  protected readonly status = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  private readonly router = inject(Router);
  protected readonly brandStatus = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly brands = signal<Brand[]>([]);
  protected readonly brandQuery = signal('');
  protected readonly isBrandSearching = signal(false);
  protected readonly brandInputDirty = signal(false);
  protected readonly selectedBrand = signal<Brand | null>(null);
  protected readonly filteredBrands = computed(() => {
    if (!this.isBrandSearching()) {
      return [];
    }

    const options = this.brands();
    const hasUserQuery = this.brandInputDirty();
    const query = hasUserQuery ? this.brandQuery().trim().toLowerCase() : '';

    if (!query) {
      return options;
    }

    return options.filter((brand) => brand.name.toLowerCase().includes(query));
  });

  protected readonly colorMode = signal<ColorMode>('single');
  protected readonly multiColorDirection = signal<MultiColorDirection>('coextrusada');
  protected readonly multiColors = signal<string[]>(['#f97316', '#0ea5e9']);
  private readonly minMultiColors = 2;

  protected readonly materials = ['PLA', 'PLA+', 'PETG', 'ABS', 'ASA', 'Nylon', 'TPU'];
  protected readonly finishes = ['Matte', 'Silk', 'Glossy', 'Satin', 'Textured'];
  protected readonly spoolTypes = ['Standard', 'Masterspool', 'Cardboard', 'Refill'];

  protected readonly filamentForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    brandId: this.fb.control<number | null>(null, Validators.required),
    material: ['PLA', Validators.required],
    finish: ['Matte'],
    price: [25, [Validators.required, Validators.min(0)]],
    density: [1.24, [Validators.required, Validators.min(0)]],
    diameter: [1.75, [Validators.required, Validators.min(0.5)]],
    weightGrams: [1000, [Validators.required, Validators.min(1)]],
    spoolWeightGrams: [250, [Validators.required, Validators.min(0)]],
    spoolType: ['Standard'],
    comment: [''],
    colorHex: ['#f97316'],
    extruderTempLow: [200, [Validators.required, Validators.min(0)]],
    extruderTempHigh: [215, [Validators.min(0)]],
    bedTempLow: [50, [Validators.min(0)]],
    bedTempHigh: [60, [Validators.min(0)]],
    externalId: [''],
    cost: [0, [Validators.min(0)]]
  });

  constructor() {
    this.loadBrands();
    this.filamentForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.status() !== 'idle') {
          this.status.set('idle');
          this.errorMessage.set(null);
        }
      });
  }

  protected submit(addAnother = false): void {
    if (this.filamentForm.invalid) {
      this.filamentForm.markAllAsTouched();
      if (!this.filamentForm.controls.brandId.value) {
        this.errorMessage.set('Selecione um fabricante para continuar.');
      }
      return;
    }

    const value = this.filamentForm.getRawValue();
    const colorMode = this.colorMode();

    const payload: FilamentCreate = {
      brandId: value.brandId!,
      name: value.name,
      material: value.material,
      price: Number(value.price),
      density: Number(value.density),
      diameter: Number(value.diameter),
      weightGrams: Number(value.weightGrams),
      spoolWeightGrams: Number(value.spoolWeightGrams),
      spoolType: value.spoolType ?? '',
      comment: value.comment ?? '',
      settingsExtruderTemp: this.buildTemperatureRange(value.extruderTempLow, value.extruderTempHigh),
      settingsBedTemp: this.buildTemperatureRange(value.bedTempLow, value.bedTempHigh),
      colorHex: colorMode === 'single' ? this.normalizeColor(value.colorHex) : '',
      externalId: value.externalId ?? '',
      multiColorHexes: colorMode === 'multi' ? this.multiColors().join(',') : '',
      multiColorDirection: colorMode === 'multi' ? this.multiColorDirection() : '',
      cost: value.cost && value.cost > 0 ? Number(value.cost) : Number(value.price),
      finish: value.finish ?? ''
    };

    this.status.set('saving');
    this.errorMessage.set(null);

    this.filamentService
      .createFilament(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (filament) => {
          this.status.set('success');
          this.filamentCreated.emit(filament);
          if (addAnother) {
            this.resetFormKeepingBrand();
            return;
          } else {
            this.resetForm();
          }
          this.router.navigate(['/filament']);
        },
        error: (error: unknown) => {
          this.status.set('error');
          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  protected cancel(): void {
    this.resetForm();
    this.status.set('idle');
    this.errorMessage.set(null);

  }

  protected setColorMode(mode: ColorMode): void {
    this.colorMode.set(mode);
  }

  protected setMultiColorDirection(direction: MultiColorDirection): void {
    this.multiColorDirection.set(direction);
  }

  protected updateColorStop(index: number, value: string): void {
    this.multiColors.update((colors) => {
      const next = [...colors];
      next[index] = this.normalizeColor(value);
      return next;
    });
  }

  protected addColorStop(): void {
    this.multiColors.update((colors) => [...colors, '#3b82f6']);
  }

  protected removeColorStop(index: number): void {
    this.multiColors.update((colors) => {
      if (colors.length <= this.minMultiColors) {
        return colors;
      }
      return colors.filter((_, i) => i !== index);
    });
  }

  protected onBrandQueryChange(value: string): void {
    this.brandQuery.set(value);
    this.brandInputDirty.set(true);
    this.isBrandSearching.set(true);
    this.selectedBrand.set(null);
    this.filamentForm.controls.brandId.setValue(null);
  }

  protected selectBrand(brand: Brand): void {
    this.clearBrandDropdownCloseTimer();
    this.selectedBrand.set(brand);
    this.brandQuery.set(brand.name);
    this.filamentForm.controls.brandId.setValue(brand.id);
    this.brandInputDirty.set(false);
    this.isBrandSearching.set(false);
  }

  protected clearBrandSelection(): void {
    this.clearBrandDropdownCloseTimer();
    this.selectedBrand.set(null);
    this.brandQuery.set('');
    this.filamentForm.controls.brandId.setValue(null);
    this.isBrandSearching.set(false);
    this.brandInputDirty.set(false);
  }

  protected isMultiColor(): boolean {
    return this.colorMode() === 'multi';
  }

  protected showBrandSuggestions(): boolean {
    return this.isBrandSearching() && this.brandStatus() === 'ready' && this.filteredBrands().length > 0;
  }

  protected onBrandInputFocus(): void {
    this.clearBrandDropdownCloseTimer();
    this.isBrandSearching.set(true);
  }

  protected onBrandInputBlur(): void {
    this.clearBrandDropdownCloseTimer();
    this.brandDropdownCloseHandle = setTimeout(() => {
      this.isBrandSearching.set(false);
    }, 120);
  }

  protected toggleBrandDropdown(): void {
    if (this.isBrandSearching()) {
      this.isBrandSearching.set(false);
      return;
    }

    this.isBrandSearching.set(true);
    this.focusBrandInput();
  }

  private focusBrandInput(): void {
    this.brandSearchInput?.nativeElement.focus();
  }

  private clearBrandDropdownCloseTimer(): void {
    if (this.brandDropdownCloseHandle) {
      clearTimeout(this.brandDropdownCloseHandle);
      this.brandDropdownCloseHandle = null;
    }
  }

  protected trackBrand = (_: number, brand: Brand) => brand.id;

  private loadBrands(): void {
    this.brandStatus.set('loading');
    this.brandService
      .listBrands()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (brands) => {
          this.brands.set(brands);
          this.brandStatus.set('ready');
        },
        error: (error: unknown) => {
          this.brandStatus.set('error');
          this.errorMessage.set(this.resolveErrorMessage(error, 'Não foi possível carregar os Brands.'));
        }
      });
  }

  private resetForm(): void {
    this.selectedBrand.set(null);
    this.brandQuery.set('');
    this.brandInputDirty.set(false);
    this.isBrandSearching.set(false);
    this.filamentForm.reset({
      name: '',
      brandId: null,
      material: 'PLA',
      finish: 'Matte',
      price: 25,
      density: 1.24,
      diameter: 1.75,
      weightGrams: 1000,
      spoolWeightGrams: 250,
      spoolType: 'Standard',
      comment: '',
      colorHex: '#f97316',
      extruderTempLow: 200,
      extruderTempHigh: 215,
      bedTempLow: 50,
      bedTempHigh: 60,
      externalId: '',
      cost: 0
    });
    this.colorMode.set('single');
    this.multiColorDirection.set('coextrusada');
    this.multiColors.set(['#f97316', '#0ea5e9']);
  }

  private resetFormKeepingBrand(): void {
    const selected = this.selectedBrand();
    this.filamentForm.reset({
      name: '',
      brandId: selected?.id ?? null,
      material: 'PLA',
      finish: 'Matte',
      price: 25,
      density: 1.24,
      diameter: 1.75,
      weightGrams: 1000,
      spoolWeightGrams: 250,
      spoolType: 'Standard',
      comment: '',
      colorHex: '#f97316',
      extruderTempLow: 200,
      extruderTempHigh: 215,
      bedTempLow: 50,
      bedTempHigh: 60,
      externalId: '',
      cost: 0
    });
    if (!selected) {
      this.brandQuery.set('');
    } else {
      this.brandQuery.set(selected.name);
    }
    this.brandInputDirty.set(false);
    this.isBrandSearching.set(false);
    this.colorMode.set('single');
    this.multiColorDirection.set('coextrusada');
    this.multiColors.set(['#f97316', '#0ea5e9']);
  }

  private buildTemperatureRange(low?: number | null, high?: number | null): number[] {
    const values: number[] = [];
    const lowValue = typeof low === 'number' ? Math.round(low) : null;
    const highValue = typeof high === 'number' ? Math.round(high) : null;

    if (lowValue !== null && !isNaN(lowValue)) {
      values.push(lowValue);
    }

    if (highValue !== null && !isNaN(highValue) && highValue !== lowValue) {
      values.push(highValue);
    }

    return values;
  }

  private normalizeColor(value: string | null | undefined): string {
    if (!value) {
      return '#000000';
    }

    const trimmed = value.trim();
    if (trimmed.startsWith('#')) {
      return trimmed.length === 7 ? trimmed : '#000000';
    }

    return `#${trimmed}`.slice(0, 7);
  }

  private resolveErrorMessage(error: unknown, fallback = 'Não foi possível salvar o filament.'): string {
    if (error instanceof HttpErrorResponse) {
      const serverError = error.error as { error?: string; message?: string } | null;
      return serverError?.error ?? serverError?.message ?? fallback;
    }

    return fallback;
  }
}

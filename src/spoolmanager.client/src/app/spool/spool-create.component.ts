import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SpoolCreate } from '../../models/Dto/SpoolCreate';
import { Spool } from '../../models/domain/Spool';
import { Filament } from '../../models/domain/Filament';
import { SpoolmanFilament } from '../../models/external/SpoolmanFilament';
import { SpoolService } from './spool.service';
import { FilamentService } from '../filament/filament.service';
import { Router } from '@angular/router';

const DEFAULT_INITIAL_WEIGHT = 1000;
const DEFAULT_SPOOL_WEIGHT = 250;

type FilamentOptionSource = 'local' | 'external';

interface FilamentOption {
  key: string;
  label: string;
  source: FilamentOptionSource;
  filamentId?: number;
  externalId?: string;
  initialWeight?: number;
  spoolWeight?: number;
}

@Component({
  selector: 'app-spool-create',
  templateUrl: './spool-create.component.html',
  styleUrl: './spool-create.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpoolCreateComponent {
  private readonly spoolService = inject(SpoolService);
  private readonly filamentService = inject(FilamentService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  @ViewChild('filamentSearchInput') private filamentSearchInput?: ElementRef<HTMLInputElement>;
  private filamentDropdownCloseHandle: ReturnType<typeof setTimeout> | null = null;

  @Output() readonly spoolCreated = new EventEmitter<Spool>();

  protected readonly status = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly filamentStatus = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly filamentError = signal<string | null>(null);
  protected readonly filamentOptions = signal<FilamentOption[]>([]);
  protected readonly filamentQuery = signal('');
  protected readonly filamentInputDirty = signal(false);
  protected readonly isFilamentSearching = signal(false);
  protected readonly selectedFilament = signal<FilamentOption | null>(null);
  protected readonly filteredFilaments = computed(() => {
    if (!this.isFilamentSearching()) {
      return [];
    }

    const options = this.filamentOptions();
    const query = this.filamentQuery().trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(query));
  });

  protected readonly measuredWeight = signal(DEFAULT_INITIAL_WEIGHT + DEFAULT_SPOOL_WEIGHT);
  protected readonly remainingWeight = signal(DEFAULT_INITIAL_WEIGHT);

  protected readonly spoolForm = this.fb.nonNullable.group(
    {
      filamentId: this.fb.control<number | null>(null),
      externalId: [''],
      price: [45, [Validators.required, Validators.min(0)]],
      initialWeight: [DEFAULT_INITIAL_WEIGHT, [Validators.required, Validators.min(1)]],
      spoolWeight: [DEFAULT_SPOOL_WEIGHT, [Validators.min(0)]],
      usedWeight: [0, [Validators.min(0)]],
      lotNumber: [''],
      location: [''],
      comment: [''],
      firstUsed: [''],
      lastUsed: [''],
      qty: [1, [Validators.required, Validators.min(1)]]
    },
    { validators: this.requireFilamentSelectionValidator() }
  );

  constructor() {
    this.loadFilamentOptions();
    this.spoolForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.status() !== 'idle') {
          this.status.set('idle');
          this.errorMessage.set(null);
        }
      });

    this.setupWeightObservers();
  }

  protected submit(addAnother = false): void {
    if (this.spoolForm.invalid) {
      this.spoolForm.markAllAsTouched();
      return;
    }

    const value = this.spoolForm.getRawValue();
    const payload: Partial<SpoolCreate> = {
      filamentId: value.filamentId ?? undefined,
      externalId: value.externalId?.trim() || "",
      price: Number(value.price),
      initialWeight: Number(value.initialWeight),
      usedWeight: Number(value.usedWeight ?? 0),
      lotNumber: value.lotNumber?.trim() ?? '',
      location: value.location?.trim() ?? '',
      comment: value.comment?.trim() ?? '',
      qty: Number(value.qty)
    };

    console.log('Submitting spool with payload:', payload);

    if (value.firstUsed) {
      payload.firstUsed = this.toIsoString(value.firstUsed);
    }

    if (value.lastUsed) {
      payload.lastUsed = this.toIsoString(value.lastUsed);
    }

    this.status.set('saving');
    this.errorMessage.set(null);

    this.spoolService
      .createSpool(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (spool) => {
          this.status.set('success');
          this.spoolCreated.emit(spool);
          if (addAnother) {
            this.resetForm(false);
            return;
          } else {
            this.resetForm(true);
          }
          this.router.navigate(['/spool']);
        },
        error: (error) => {
          this.status.set('error');
          this.errorMessage.set(this.resolveErrorMessage(error));
        }
      });
  }

  private setupWeightObservers(): void {
    this.updateMeasuredWeight();
    this.updateRemainingWeight();

    this.spoolForm.controls.initialWeight.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateMeasuredWeight();
        this.updateRemainingWeight();
      });

    this.spoolForm.controls.usedWeight.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateRemainingWeight());

    this.spoolForm.controls.spoolWeight.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateMeasuredWeight());
  }

  protected cancel(): void {
    this.resetForm(true);
    this.status.set('idle');
    this.errorMessage.set(null);
  }

  protected onFilamentQueryChange(value: string): void {
    this.filamentQuery.set(value);
    this.filamentInputDirty.set(true);
    this.isFilamentSearching.set(true);
    if (this.selectedFilament()) {
      this.selectedFilament.set(null);
      this.spoolForm.controls.filamentId.setValue(null);
      this.spoolForm.controls.externalId.setValue('');
    }
  }

  protected selectFilament(option: FilamentOption): void {
    this.clearFilamentDropdownCloseTimer();
    this.selectedFilament.set(option);
    this.filamentQuery.set(option.label);
    this.filamentInputDirty.set(false);
    this.isFilamentSearching.set(false);
    console.log('Selected filament option:', option);

    if (option.source === 'local') {
      this.spoolForm.controls.filamentId.setValue(option.filamentId ?? null);
      this.spoolForm.controls.externalId.setValue('');
    } else {
      this.spoolForm.controls.filamentId.setValue(null);
      this.spoolForm.controls.externalId.setValue(option.externalId ?? '');
    }

    this.applyFilamentMetrics(option);
  }

  protected clearFilamentSelection(): void {
    this.clearFilamentDropdownCloseTimer();
    this.clearFilamentSelectionState();
    this.spoolForm.controls.filamentId.setValue(null);
    this.spoolForm.controls.externalId.setValue('');
    this.spoolForm.controls.initialWeight.setValue(DEFAULT_INITIAL_WEIGHT);
    this.spoolForm.controls.usedWeight.setValue(0);
    this.spoolForm.controls.spoolWeight.setValue(DEFAULT_SPOOL_WEIGHT);
    this.updateMeasuredWeight();
    this.updateRemainingWeight();
  }

  protected showFilamentSuggestions(): boolean {
    return (
      this.isFilamentSearching() &&
      this.filamentStatus() === 'ready' &&
      this.filteredFilaments().length > 0
    );
  }

  protected onFilamentInputFocus(): void {
    this.clearFilamentDropdownCloseTimer();
    this.isFilamentSearching.set(true);
  }

  protected onFilamentInputBlur(): void {
    this.clearFilamentDropdownCloseTimer();
    this.filamentDropdownCloseHandle = setTimeout(() => {
      this.isFilamentSearching.set(false);
    }, 120);
  }

  protected toggleFilamentDropdown(): void {
    if (this.isFilamentSearching()) {
      this.isFilamentSearching.set(false);
      return;
    }

    this.isFilamentSearching.set(true);
    this.focusFilamentInput();
  }

  protected openDatePicker(nativeInput?: HTMLInputElement | null): void {
    if (!nativeInput) {
      return;
    }

    if (typeof nativeInput.showPicker === 'function') {
      nativeInput.showPicker();
      return;
    }

    nativeInput.focus();
    nativeInput.click();
  }

  protected handleDateControlKeydown(event: KeyboardEvent, nativeInput?: HTMLInputElement | null): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openDatePicker(nativeInput);
    }
  }

  protected formatDisplayDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) {
      return '';
    }

    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  protected trackFilamentOption = (_: number, option: FilamentOption) => option.key;

  protected hasFilamentSelectionError(): boolean {
    return this.spoolForm.hasError('filamentSelection') && (this.spoolForm.dirty || this.spoolForm.touched);
  }

  private resetForm(resetSelection: boolean): void {
    const currentFilamentId = this.spoolForm.controls.filamentId.value;
    const currentExternalId = this.spoolForm.controls.externalId.value;
    const selected = this.selectedFilament();
    const preserveSelection = !resetSelection;
    const nextInitialWeight = preserveSelection
      ? this.parseWeight(this.spoolForm.controls.initialWeight.value)
      : DEFAULT_INITIAL_WEIGHT;
    const nextSpoolWeight = preserveSelection
      ? this.parseWeight(this.spoolForm.controls.spoolWeight.value)
      : DEFAULT_SPOOL_WEIGHT;

    this.spoolForm.reset({
      filamentId: preserveSelection ? currentFilamentId : null,
      externalId: preserveSelection ? currentExternalId : '',
      price: 45,
      initialWeight: nextInitialWeight,
      spoolWeight: nextSpoolWeight,
      usedWeight: 0,
      lotNumber: '',
      location: '',
      comment: '',
      firstUsed: '',
      lastUsed: ''
    });

    if (preserveSelection && selected) {
      this.selectedFilament.set(selected);
      this.filamentQuery.set(selected.label);
      this.filamentInputDirty.set(false);
      this.isFilamentSearching.set(false);
    } else if (!preserveSelection) {
      this.clearFilamentSelectionState();
    }

    this.updateMeasuredWeight();
    this.updateRemainingWeight();
  }

  private loadFilamentOptions(): void {
    this.filamentStatus.set('loading');
    this.filamentError.set(null);

    forkJoin({
      local: this.filamentService.listFilaments().pipe(
        catchError((error) => {
          this.filamentError.set(this.resolveErrorMessage(error, 'Não foi possível carregar os filamentos locais.'));
          return of<Filament[]>([]);
        })
      ),
      external: this.spoolService.listExternalFilaments().pipe(
        catchError((error) => {
          this.filamentError.set(this.resolveErrorMessage(error, 'Não foi possível carregar os filamentos do SpoolMan.'));
          return of<SpoolmanFilament[]>([]);
        })
      )
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ local, external }) => {
        const localOptions = local.map((filament) => this.mapLocalFilament(filament));
        const localExternalIds = new Set(
          local
            .map((filament) => this.normalizeExternalId(filament.externalId))
            .filter((value): value is string => Boolean(value))
        );

        const externalOptions = external
          .filter((filament) => {
            const normalizedId = this.normalizeExternalId(filament.id);
            return !normalizedId || !localExternalIds.has(normalizedId);
          })
          .map((filament) => this.mapExternalFilament(filament));

        const options = [...localOptions, ...externalOptions];

        options.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

        const hasOptions = options.length > 0;
        this.filamentOptions.set(options);
        this.filamentStatus.set(hasOptions ? 'ready' : 'error');

        if (!hasOptions && !this.filamentError()) {
          this.filamentError.set('Nenhum filamento disponível para seleção.');
        }
      });
  }

  private mapLocalFilament(filament: Filament): FilamentOption {
    return {
      key: `local-${filament.id}`,
      label: this.buildLocalFilamentLabel(filament),
      source: 'local',
      filamentId: filament.id,
      externalId: filament.externalId || undefined,
      initialWeight: filament.weightGrams ?? undefined,
      spoolWeight: filament.spoolWeightGrams ?? undefined
    };
  }

  private mapExternalFilament(filament: SpoolmanFilament): FilamentOption {
    if(filament.id === "bambulab_abs_bambugreen_1000_175_n") {

      console.log('Mapping external filament:', filament);
    }
    return {
      key: `external-${filament.id}`,
      label: filament.fullName || `${filament.manufacturer} - ${filament.name}`,
      source: 'external',
      externalId: filament.id,
      initialWeight: filament.weight ?? undefined,
      spoolWeight: filament.spoolWeight ?? undefined
    };
  }

  private applyFilamentMetrics(option: FilamentOption): void {
    if (typeof option.initialWeight === 'number') {
      this.spoolForm.controls.initialWeight.setValue(
        this.normalizeWeight(option.initialWeight, DEFAULT_INITIAL_WEIGHT)
      );
    }

    if (typeof option.spoolWeight === 'number') {
      this.spoolForm.controls.spoolWeight.setValue(
        this.normalizeWeight(option.spoolWeight, DEFAULT_SPOOL_WEIGHT)
      );
    } else {
      this.spoolForm.controls.spoolWeight.setValue(DEFAULT_SPOOL_WEIGHT);
    }

    this.spoolForm.controls.usedWeight.setValue(0);
    this.updateMeasuredWeight();
    this.updateRemainingWeight();
  }

  private normalizeWeight(value: number | null | undefined, fallback: number): number {
    const parsed = typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
    return Math.max(Math.round(parsed), 0);
  }

  private parseWeight(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private updateMeasuredWeight(): void {
    const total =
      this.parseWeight(this.spoolForm.controls.initialWeight.value) +
      this.parseWeight(this.spoolForm.controls.spoolWeight.value);
    this.measuredWeight.set(this.normalizeWeight(total, 0));
  }

  private updateRemainingWeight(): void {
    const remaining =
      this.parseWeight(this.spoolForm.controls.initialWeight.value) -
      this.parseWeight(this.spoolForm.controls.usedWeight.value);
    this.remainingWeight.set(this.normalizeWeight(Math.max(remaining, 0), 0));
  }

  private buildLocalFilamentLabel(filament: Filament): string {
    const brandName = filament.brand?.name ?? 'Catálogo interno';
    const diameter = filament.diameter ? `${filament.diameter}mm` : '';
    const weightValue = filament.weightGrams ? filament.weightGrams / 1000 : 0;
    const weightKg = weightValue ? `${Number.isInteger(weightValue) ? weightValue : weightValue.toFixed(1)}kg` : '';
    const specs = [filament.material, diameter, weightKg].filter(Boolean).join(', ');
    return specs ? `${brandName} - ${filament.name} (${specs})` : `${brandName} - ${filament.name}`;
  }

  private clearFilamentSelectionState(): void {
    this.selectedFilament.set(null);
    this.filamentQuery.set('');
    this.filamentInputDirty.set(false);
    this.isFilamentSearching.set(false);
  }

  private focusFilamentInput(): void {
    this.filamentSearchInput?.nativeElement.focus();
  }

  private clearFilamentDropdownCloseTimer(): void {
    if (this.filamentDropdownCloseHandle) {
      clearTimeout(this.filamentDropdownCloseHandle);
      this.filamentDropdownCloseHandle = null;
    }
  }

  private requireFilamentSelectionValidator(): ValidatorFn {
    return (group) => {
      const filamentId = group.get('filamentId')?.value;
      const externalId = group.get('externalId')?.value?.toString().trim();
      return filamentId || externalId ? null : { filamentSelection: true };
    };
  }

  private toIsoString(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  private resolveErrorMessage(error: unknown, fallback = 'Unable to create the spool.'): string {
    if (error instanceof HttpErrorResponse) {
      const serverError = error.error as { error?: string; message?: string } | null;
      return serverError?.error ?? serverError?.message ?? fallback;
    }

    return fallback;
  }

  private normalizeExternalId(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed.toLowerCase() : null;
  }
}

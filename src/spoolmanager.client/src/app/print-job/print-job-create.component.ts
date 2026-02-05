import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { PrintJobService } from './print-job.service';
import { SpoolService } from '../spool/spool.service';
import { PrintJob } from '../../models/domain/PrintJob';
import { PrintJobCreate } from '../../models/Dto/PrintJobCreate';
import { Spool } from '../../models/domain/Spool';

type SpoolUsageFormValue = {
  spoolId: number | null;
  gramsUsed: number | null | undefined;
};

@Component({
  selector: 'app-print-job-create',
  templateUrl: './print-job-create.component.html',
  styleUrl: './print-job-create.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrintJobCreateComponent {
  private readonly printJobService = inject(PrintJobService);
  private readonly spoolService = inject(SpoolService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @Output() readonly printJobCreated = new EventEmitter<PrintJob>();

  protected readonly status = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly spoolStatus = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly spools = signal<Spool[]>([]);
  protected readonly spoolSearch = signal('');
  protected readonly filteredSpools = computed(() => {
    const query = this.spoolSearch().trim().toLowerCase();
    const items = this.spools();

    if (!query) {
      return items;
    }

    return items.filter((spool) => {
      const filamentName = spool.filament?.name?.toLowerCase() ?? '';
      const brandName = spool.filament?.brand?.name?.toLowerCase() ?? '';
      return filamentName.includes(query) || brandName.includes(query) || `${spool.id}`.includes(query);
    });
  });

  protected readonly printJobForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    printDate: [this.todayInputValue(), Validators.required],
    hoursDuration: [0, [Validators.min(0)]],
    minutesDuration: [0, [Validators.min(0), Validators.max(59)]],
    fileLink: [''],
    energyKwh: [null as number | null],
    energyCost: [null as number | null],
    spools: this.fb.nonNullable.array([this.buildSpoolGroup()])
  });

  constructor() {
    this.loadSpools();
    this.printJobForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.status() !== 'idle') {
          this.status.set('idle');
          this.errorMessage.set(null);
        }
      });
  }

  protected get spoolArray(): FormArray {
    return this.printJobForm.controls.spools as FormArray;
  }

  protected addSpoolUsage(): void {
    this.spoolArray.push(this.buildSpoolGroup());
  }

  protected removeSpoolUsage(index: number): void {
    if (this.spoolArray.length === 1) {
      this.spoolArray.at(0).reset({ spoolId: null, gramsUsed: 0 });
      return;
    }

    this.spoolArray.removeAt(index);
  }

  protected submit(addAnother = false): void {
    if (this.printJobForm.invalid || this.hasInvalidSpoolSelection()) {
      this.printJobForm.markAllAsTouched();
      this.spoolArray.controls.forEach((control) => control.markAllAsTouched());
      if (this.spoolArray.length === 0) {
        this.addSpoolUsage();
      }
      this.errorMessage.set('Preencha os dados obrigatórios e selecione ao menos uma bobina.');
      return;
    }

    const value = this.printJobForm.getRawValue();
    const payload: PrintJobCreate = {
      name: value.name.trim(),
      printDate: this.toIsoDate(value.printDate),
      hoursDuration: Number(value.hoursDuration ?? 0),
      minutesDuration: Number(value.minutesDuration ?? 0),
      fileLink: value.fileLink?.trim() ?? '',
      energyKwh: value.energyKwh ?? null,
      energyCost: value.energyCost ?? null,
      printJobSpool: this.spoolArray.controls.map((control) => ({
        spoolId: control.value.spoolId!,
        gramsUsed: Number(control.value.gramsUsed ?? 0)
      }))
    };

    this.status.set('saving');
    this.errorMessage.set(null);

    this.printJobService
      .createPrintJob(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (job) => {
          this.status.set('success');
          this.printJobCreated.emit(job);
          if (addAnother) {
            this.resetForm(true);
            return;
          }
          this.resetForm();
          this.router.navigate(['/print-jobs']);
        },
        error: (error) => {
          this.status.set('error');
          this.errorMessage.set(this.resolveError(error));
        }
      });
  }

  protected cancel(): void {
    this.resetForm();
    this.status.set('idle');
    this.errorMessage.set(null);
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

  protected updateSpoolSearch(query: string): void {
    this.spoolSearch.set(query);
  }

  protected availableSpools(): Spool[] {
    return this.filteredSpools();
  }

  protected displaySpoolLabel(spool: Spool): string {
    const filamentName = spool.filament?.name ?? 'Filamento';
    const brand = spool.filament?.brand?.name;
    const label = brand ? `${brand} · ${filamentName}` : filamentName;
    return `${label} (#${spool.id})`;
  }

  private loadSpools(): void {
    this.spoolStatus.set('loading');
    this.spoolService
      .listSpools()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (spools) => {
          this.spools.set(spools);
          this.spoolStatus.set(spools.length > 0 ? 'ready' : 'error');
          if (spools.length === 0) {
            this.errorMessage.set('Cadastre uma bobina antes de registrar um job.');
          }
        },
        error: (error) => {
          this.spoolStatus.set('error');
          this.errorMessage.set(this.resolveError(error));
        }
      });
  }

  private buildSpoolGroup() {
    return this.fb.nonNullable.group({
      spoolId: this.fb.control<number | null>(null, Validators.required),
      gramsUsed: [0, [Validators.required, Validators.min(1)]]
    });
  }

  private resetForm(keepSpools = false): void {
    const preservedSpools: SpoolUsageFormValue[] | null = keepSpools
      ? (this.spoolArray.value as SpoolUsageFormValue[])
      : null;

    this.printJobForm.reset({
      name: '',
      printDate: this.todayInputValue(),
      hoursDuration: 0,
      minutesDuration: 0,
      fileLink: '',
      energyKwh: null,
      energyCost: null,
      spools: []
    });

    this.spoolArray.clear();

    if (preservedSpools && preservedSpools.length > 0) {
      preservedSpools.forEach((entry) => {
        this.spoolArray.push(
          this.fb.nonNullable.group({
            spoolId: this.fb.control<number | null>(entry.spoolId, Validators.required),
            gramsUsed: [entry.gramsUsed ?? 0, [Validators.required, Validators.min(1)]]
          })
        );
      });
    } else {
      this.spoolArray.push(this.buildSpoolGroup());
    }
  }

  private hasInvalidSpoolSelection(): boolean {
    return this.spoolArray.controls.some((control) => control.invalid);
  }

  private todayInputValue(): string {
    const date = new Date();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private toIsoDate(value: string): string {
    if (!value) {
      return new Date().toISOString();
    }

    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const serverError = error.error as { error?: string; message?: string } | null;
      return serverError?.error ?? serverError?.message ?? 'Não foi possível salvar o job.';
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message?: string }).message);
    }

    return 'Não foi possível salvar o job.';
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PrintJob } from '../../models/domain/PrintJob';
import { PrintJobService } from './print-job.service';

@Component({
  selector: 'app-print-job-list',
  templateUrl: './print-job-list.component.html',
  styleUrl: './print-job-list.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrintJobListComponent {
  private readonly printJobService = inject(PrintJobService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly printJobs = signal<PrintJob[]>([]);
  protected readonly sortState = signal<{ column: SortColumn; direction: SortDirection }>({ column: 'date', direction: 'desc' });
  protected readonly sortedPrintJobs = computed(() => {
    const jobs = [...this.printJobs()];
    const { column, direction } = this.sortState();
    const factor = direction === 'asc' ? 1 : -1;

    return jobs.sort((a, b) => factor * this.compareByColumn(column, a, b));
  });

  constructor() {
    this.loadPrintJobs();
  }

  refresh(): void {
    this.loadPrintJobs();
  }

  protected trackByPrintJob = (_: number, job: PrintJob) => job.id;

  protected setSort(column: SortColumn): void {
    this.sortState.update((current) => {
      if (current.column === column) {
        return {
          column,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }

      return { column, direction: 'desc' };
    });
  }

  protected isSorted(column: SortColumn): boolean {
    return this.sortState().column === column;
  }

  protected sortIcon(column: SortColumn): string {
    if (!this.isSorted(column)) {
      return '↕';
    }

    return this.sortState().direction === 'asc' ? '↑' : '↓';
  }

  protected ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    if (!this.isSorted(column)) {
      return 'none';
    }

    return this.sortState().direction === 'asc' ? 'ascending' : 'descending';
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  protected formatDuration(value?: string | null): string {
    if (!value) {
      return '—';
    }

    const isoMatch = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(value);
    if (isoMatch) {
      const hours = Number(isoMatch[1] ?? 0);
      const minutes = Number(isoMatch[2] ?? 0);
      return this.buildDurationLabel(hours, minutes);
    }

    const segments = value.split(':').map((part) => Number(part));
    if (segments.length >= 2 && segments.every((part) => !Number.isNaN(part))) {
      const [hours, minutes] = segments;
      return this.buildDurationLabel(hours, minutes);
    }

    return value;
  }

  protected spoolCount(job: PrintJob): number {
    return job.printJobSpool?.length ?? 0;
  }

  protected totalGrams(job: PrintJob): number {
    return job.printJobSpool?.reduce((sum, usage) => sum + Number(usage.gramsUsed ?? 0), 0) ?? 0;
  }

  protected formatCurrency(value?: number | null): string {
    if (typeof value !== 'number') {
      return '—';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  protected spoolLabel(job: PrintJob): string {
    const count = this.spoolCount(job);
    const grams = this.totalGrams(job);
    if (count === 0) {
      return 'Nenhuma bobina selecionada';
    }

    return `${count} bobina${count > 1 ? 's' : ''} · ${grams.toLocaleString('pt-BR')} g`;
  }

  private buildDurationLabel(hours: number, minutes: number): string {
    const safeHours = Math.max(0, Math.trunc(hours));
    const safeMinutes = Math.max(0, Math.trunc(minutes));
    const parts: string[] = [];

    if (safeHours > 0) {
      parts.push(`${safeHours}h`);
    }

    parts.push(`${safeMinutes.toString().padStart(2, '0')}min`);
    return parts.join(' ');
  }

  private loadPrintJobs(): void {
    this.status.set('loading');
    this.errorMessage.set(null);

    this.printJobService
      .listPrintJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.printJobs.set(jobs);
          this.status.set('ready');
        },
        error: (error) => {
          this.status.set('error');
          const message =
            (error as { error?: { error?: string; message?: string }; message?: string })?.error?.error ??
            (error as { error?: { message?: string } })?.error?.message ??
            (error as { message?: string })?.message ??
            'Não foi possível carregar as impressões.';
          this.errorMessage.set(message);
        }
      });
  }

  private compareByColumn(column: SortColumn, a: PrintJob, b: PrintJob): number {
    switch (column) {
      case 'date':
        return this.dateValue(a) - this.dateValue(b);
      case 'duration':
        return this.durationValue(a) - this.durationValue(b);
      case 'name':
        return this.nameValue(a).localeCompare(this.nameValue(b), 'pt-BR');
      case 'cost':
        return this.costValue(a) - this.costValue(b);
      default:
        return 0;
    }
  }

  private dateValue(job: PrintJob): number {
    if (!job.printDate) {
      return 0;
    }

    const time = Date.parse(job.printDate);
    return Number.isNaN(time) ? 0 : time;
  }

  private durationValue(job: PrintJob): number {
    const value = job.duration;
    if (!value) {
      return 0;
    }

    const isoMatch = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(value);
    if (isoMatch) {
      const hours = Number(isoMatch[1] ?? 0);
      const minutes = Number(isoMatch[2] ?? 0);
      const seconds = Number(isoMatch[3] ?? 0);
      return hours * 60 + minutes + seconds / 60;
    }

    const parts = value.split(':').map((part) => Number(part));
    if (parts.length >= 2 && parts.every((part) => Number.isFinite(part))) {
      const [hours, minutes, seconds = 0] = parts;
      return hours * 60 + minutes + seconds / 60;
    }

    return 0;
  }

  private nameValue(job: PrintJob): string {
    return (job.name ?? '').toLocaleLowerCase('pt-BR');
  }

  private costValue(job: PrintJob): number {
    return Number(job.totalCost ?? 0);
  }
}

type SortColumn = 'date' | 'duration' | 'name' | 'cost';
type SortDirection = 'asc' | 'desc';

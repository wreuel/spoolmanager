import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { BrandCreate } from '../../models/Dto/BrandCreate';
import { Brand } from '../../models/domain/Brand';
import { BrandService } from './brand.service';

@Component({
  selector: 'app-brand-create',
  templateUrl: './brand-create.component.html',
  styleUrl: './brand-create.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly brandService = inject(BrandService);
  private readonly router = inject(Router);

  @Output() readonly brandCreated = new EventEmitter<Brand>();
  @Output() readonly cancelClicked = new EventEmitter<void>();
  @Output() readonly saveAndNew = new EventEmitter<Brand>();

  protected readonly status = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly brandForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]]
  });

  constructor() {
    this.brandForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.status() !== 'idle') {
          this.status.set('idle');
          this.errorMessage.set(null);
        }
      });
  }

  protected submit(addAnother = false): void {
    if (this.brandForm.invalid) {
      this.brandForm.markAllAsTouched();
      return;
    }

    const payload: BrandCreate = this.brandForm.getRawValue();

    this.status.set('saving');
    this.errorMessage.set(null);

    this.brandService.createBrand(payload).subscribe({
      next: (brand) => {
        this.status.set('success');
        this.brandForm.reset({ name: '' });
        this.brandCreated.emit(brand);
        if (addAnother) {
          this.saveAndNew.emit(brand);
          return;
        }

        this.router.navigate(['/brands']);
      },
      error: (error) => {
        this.status.set('error');
        this.errorMessage.set(this.resolveErrorMessage(error));
      }
    });
  }

  protected get isSaving(): boolean {
    return this.status() === 'saving';
  }

  protected get showSuccessMessage(): boolean {
    return this.status() === 'success';
  }

  protected get showErrorMessage(): boolean {
    return this.status() === 'error';
  }

  protected cancel(): void {
    this.brandForm.reset({ name: '' });
    this.status.set('idle');
    this.errorMessage.set(null);
    this.cancelClicked.emit();
  }

  protected shouldShowError(controlName: keyof typeof this.brandForm.controls): boolean {
    const control = this.brandForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const serverError = error.error as { error?: string; message?: string } | null;
      return serverError?.error ?? serverError?.message ?? 'Unable to create the brand right now.';
    }

    return 'Unable to create the brand right now.';
  }
}

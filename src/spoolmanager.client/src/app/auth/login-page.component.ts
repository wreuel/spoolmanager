import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<'idle' | 'loading' | 'error'>('idle');
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  constructor() {
    if (this.authState.isAuthenticated()) {
      this.router.navigateByUrl('/');
    }
  }

  submit(): void {
    if (this.form.invalid || this.status() === 'loading') {
      this.form.markAllAsTouched();
      return;
    }

    this.status.set('loading');
    this.errorMessage.set(null);

    const credentials = this.form.getRawValue();

    this.authService
      .login(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.status.set('idle');
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
          this.router.navigateByUrl(returnUrl);
        },
        error: (error: HttpErrorResponse) => {
          this.status.set('error');
          const serverError = (error.error?.error as string) || 'Invalid username or password.';
          this.errorMessage.set(serverError);
        }
      });
  }

  controlInvalid(controlName: 'username' | 'password'): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}

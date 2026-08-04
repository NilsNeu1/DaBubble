import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { fieldError } from '../../../shared/forms/field-error';
import { AuthCard } from '../../../shared/ui/auth-card/auth-card';
import { Button } from '../../../shared/ui/button/button';
import { TextField } from '../../../shared/ui/text-field/text-field';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, AuthCard, TextField, Button],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly fieldError = fieldError;
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly success = signal(false);
  private readonly oobCode = this.route.snapshot.queryParamMap.get('oobCode');

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  goBack(): void {
    this.router.navigateByUrl('/login');
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.oobCode) {
      this.formError.set('Der Link ist ungültig oder wurde bereits verwendet.');
      return;
    }

    const { password } = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);

    try {
      await this.authService.confirmPasswordReset(this.oobCode, password);
      this.success.set(true);
      setTimeout(() => this.router.navigateByUrl('/login'), 2000);
    } catch (error) {
      this.formError.set((error as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}

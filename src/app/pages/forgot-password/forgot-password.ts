import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { AuthCard } from '../../shared/ui/auth-card/auth-card';
import { Button } from '../../shared/ui/button/button';
import { TextField } from '../../shared/ui/text-field/text-field';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, AuthCard, TextField, Button],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly emailSent = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  emailError(): string | null {
    const control = this.form.controls.email;
    return control.touched && control.invalid
      ? '*Diese E-Mail-Adresse ist leider ungültig.'
      : null;
  }

  goBack(): void {
    this.router.navigateByUrl('/login');
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);

    try {
      await this.authService.sendPasswordReset(email);
      this.emailSent.set(true);
      setTimeout(() => this.router.navigateByUrl('/reset-password'), 2000);
    } catch (error) {
      this.formError.set((error as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}

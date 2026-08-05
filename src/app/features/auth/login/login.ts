import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { AuthCard } from '../../../shared/ui/auth-card/auth-card';
import { Button } from '../../../shared/ui/button/button';
import { TextField } from '../../../shared/ui/text-field/text-field';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthCard, TextField, Button],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  emailError(): string | null {
    const control = this.form.controls.email;
    return control.touched && control.invalid
      ? '*Diese E-Mail-Adresse ist leider ungültig.'
      : null;
  }

  passwordError(): string | null {
    const control = this.form.controls.password;
    if (this.formError()) {
      return 'Falsches Passwort oder E-Mail. Bitte noch einmal versuchen.';
    }
    return control.touched && control.invalid
      ? 'Falsches Passwort oder E-Mail. Bitte noch einmal versuchen.'
      : null;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);

    try {
      await this.authService.login(email, password);
      await this.router.navigateByUrl('/home');
    } catch (error) {
      this.formError.set((error as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.submitting.set(true);
    this.formError.set(null);
    try {
      await this.authService.loginWithGoogle();
      await this.router.navigateByUrl('/home');
    } catch (error) {
      this.formError.set((error as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }

  async loginAsGuest(): Promise<void> {
    this.submitting.set(true);
    this.formError.set(null);
    try {
      await this.authService.loginAsGuest();
      await this.router.navigateByUrl('/home');
    } catch (error) {
      this.formError.set((error as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}

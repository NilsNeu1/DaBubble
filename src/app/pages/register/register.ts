import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { AuthCard } from '../../shared/ui/auth-card/auth-card';
import { Button } from '../../shared/ui/button/button';
import { TextField } from '../../shared/ui/text-field/text-field';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthCard, TextField, Button],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    acceptTerms: [false, [Validators.requiredTrue]],
  });

  nameError(): string | null {
    const control = this.form.controls.name;
    return control.touched && control.invalid ? 'Bitte schreiben Sie einen Namen.' : null;
  }

  emailError(): string | null {
    const control = this.form.controls.email;
    return control.touched && control.invalid
      ? '*Diese E-Mail-Adresse ist leider ungültig.'
      : null;
  }

  passwordError(): string | null {
    const control = this.form.controls.password;
    return control.touched && control.invalid ? 'Bitte geben Sie ein Passwort ein.' : null;
  }

  goBack(): void {
    this.router.navigateByUrl('/login');
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.formError.set(null);

    try {
      await this.authService.register(name, email, password);
      await this.router.navigateByUrl('/choose-avatar');
    } catch (error) {
      this.formError.set((error as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}

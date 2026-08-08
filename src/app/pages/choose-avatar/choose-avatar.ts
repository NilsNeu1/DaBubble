import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { AVAILABLE_AVATARS, DEFAULT_AVATAR } from '../../core/models/user.model';
import { AuthCard } from '../../shared/ui/auth-card/auth-card';
import { Button } from '../../shared/ui/button/button';

@Component({
  selector: 'app-choose-avatar',
  imports: [AuthCard, Button],
  templateUrl: './choose-avatar.html',
  styleUrl: './choose-avatar.scss',
})
export class ChooseAvatar {
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);

  readonly avatars = AVAILABLE_AVATARS;
  readonly userName = this.authService.currentUser()?.name ?? '';
  readonly selectedAvatar = signal(this.authService.currentUser()?.avatarUrl ?? DEFAULT_AVATAR);
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly success = signal(false);

  selectAvatar(avatar: string): void {
    this.selectedAvatar.set(avatar);
  }

  goBack(): void {
    this.router.navigateByUrl('/register');
  }

  async submit(): Promise<void> {
    this.submitting.set(true);
    this.formError.set(null);
    try {
      await this.authService.updateAvatar(this.selectedAvatar());
      this.success.set(true);
      setTimeout(async () => {
        await this.authService.logout();
        await this.router.navigateByUrl('/login');
      }, 2000);
    } catch (error) {
      this.formError.set((error as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}

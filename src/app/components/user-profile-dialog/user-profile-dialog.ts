import {
  Component,
  computed,
  ElementRef,
  inject,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-user-profile-dialog',
  imports: [],
  templateUrl: './user-profile-dialog.html',
  styleUrl: './user-profile-dialog.scss',
})
export class UserProfileDialog {
  /** References the native user profile dialog. */
  @ViewChild('userProfileDialog')
  private userProfileDialog!: ElementRef<HTMLDialogElement>;

  /** Provides authentication and shared user data. */
  private readonly authService = inject(Auth);

  /** Emits the user ID for a new direct message. */
  public readonly messageRequested = output<string>();

  /** Stores the ID of the user whose profile is currently open. */
  private readonly selectedUserId = signal<string | null>(null);

  /** Provides the selected user from the live Firebase user data. */
  protected readonly selectedUser = computed(() => {
    const userId = this.selectedUserId();
    if (!userId) return null;
    return (
      this.authService.allUsers().find(
        (user) => user.uid === userId
      ) ?? null
    );
  });

  /** Opens the selected user's profile. */
  public openUserProfileDialog(userId: string): void {
    const userExists = this.authService.allUsers().some(
      (user) => user.uid === userId
    );
    if (!userExists) return;
    this.selectedUserId.set(userId);
    this.showUserProfileDialog();
  }

  /** Closes the user profile dialog. */
  protected closeUserProfileDialog(): void {
    const dialog = this.userProfileDialog.nativeElement;
    if (dialog.open) dialog.close();
    this.selectedUserId.set(null);
  }

  /** Requests a direct message with the selected user. */
  protected requestMessage(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.messageRequested.emit(user.uid);
    this.closeUserProfileDialog();
  }

  /** Closes the dialog when Escape is pressed. */
  protected handleUserProfileCancel(event: Event): void {
    event.preventDefault();
    this.closeUserProfileDialog();
  }

  /** Closes the dialog when its backdrop is clicked. */
  protected closeUserProfileFromBackdrop(
    event: MouseEvent
  ): void {
    if (event.target === this.userProfileDialog.nativeElement) {
      this.closeUserProfileDialog();
    }
  }

  /** Displays the native user profile dialog. */
  private showUserProfileDialog(): void {
    const dialog = this.userProfileDialog.nativeElement;
    if (!dialog.open) dialog.showModal();
  }
}
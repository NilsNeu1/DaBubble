import {
  Component,
  ElementRef,
  output,
  signal,
  ViewChild,
} from '@angular/core';

type UserProfileStatus = 'online' | 'offline';

interface UserProfileDialogData {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: UserProfileStatus;
}

const TEMP_USER_PROFILES: UserProfileDialogData[] = [
  {
    id: 'temp-user-current',
    name: 'Header Testuser',
    email: 'testuser@dabubble.test',
    avatarUrl: 'assets/default-user-avatar.png',
    status: 'online',
  },
  {
    id: 'temp-user-frederik',
    name: 'Frederik Beck',
    email: 'frederik.beck@dabubble.test',
    avatarUrl: 'assets/00.Charaters.png',
    status: 'online',
  },
  {
    id: 'temp-user-sofia',
    name: 'Sofia Müller',
    email: 'sofia.mueller@dabubble.test',
    avatarUrl: 'assets/01.Charaters.png',
    status: 'online',
  },
  {
    id: 'temp-user-noah',
    name: 'Noah Braun',
    email: 'noah.braun@dabubble.test',
    avatarUrl: 'assets/02.Charaters.png',
    status: 'offline',
  },
  {
    id: 'temp-user-elise',
    name: 'Elise Roth',
    email: 'elise.roth@dabubble.test',
    avatarUrl: 'assets/03.Charaters.png',
    status: 'online',
  },
  {
    id: 'temp-user-elias',
    name: 'Elias Neumann',
    email: 'elias.neumann@dabubble.test',
    avatarUrl: 'assets/04.Charaters.png',
    status: 'offline',
  },
  {
    id: 'temp-user-steffen',
    name: 'Steffen Hoffmann',
    email: 'steffen.hoffmann@dabubble.test',
    avatarUrl: 'assets/05.Charaters.png',
    status: 'online',
  },
];

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

  /** Emits the user ID for a new direct message. */
  public readonly messageRequested = output<string>();

  /** TEMP-USER-PROFILE-PREVIEW: Stores the selected user. */
  protected readonly selectedUser =
    signal<UserProfileDialogData | null>(null);

  /** Opens the selected temporary user profile. */
  public openUserProfileDialog(userId: string): void {
    const user = TEMP_USER_PROFILES.find(
      (profile) => profile.id === userId
    );

    if (!user) return;

    this.selectedUser.set(user);
    this.showUserProfileDialog();
  }

  /** Closes the user profile dialog. */
  protected closeUserProfileDialog(): void {
    const dialog = this.userProfileDialog.nativeElement;

    if (dialog.open) dialog.close();

    this.selectedUser.set(null);
  }

  /** Requests a direct message with the selected user. */
  protected requestMessage(): void {
    const user = this.selectedUser();

    if (!user) return;

    this.messageRequested.emit(user.id);
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
import {
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-profile-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-dialog.html',
  styleUrl: './profile-dialog.scss',
})
export class ProfileDialog {
  /** References the native profile dialog. */
  @ViewChild('profileDialog')
  private profileDialog!: ElementRef<HTMLDialogElement>;

  private readonly authService = inject(Auth);

  protected readonly currentUser = this.authService.currentUser;

  private readonly formBuilder = inject(FormBuilder);

  private readonly profileMode = signal<'view' | 'edit' | 'avatar'>('view');

  protected readonly profileName = signal('');

  protected readonly profileEmail = computed(
    () => this.currentUser()?.email ?? ''
  );

  protected readonly profileAvatarUrl = computed(
    () => this.currentUser()?.avatarUrl ?? 'assets/default-user-avatar.png'
  );

  protected readonly profileStatus = computed(
    () => this.currentUser()?.status ?? 'offline'
  );

  /** Provides the available profile avatars. */
  protected readonly availableAvatars = [
    'assets/00.Charaters.png',
    'assets/01.Charaters.png',
    'assets/02.Charaters.png',
    'assets/03.Charaters.png',
    'assets/04.Charaters.png',
    'assets/05.Charaters.png',
  ];

  /** Stores the currently previewed avatar selection. */
  protected readonly selectedAvatarUrl = signal('');

  /** Stores the avatar confirmed for the current profile edit. */
  protected readonly draftAvatarUrl = signal('');

  /** TEMP-PROFILE-EDIT: Stores the locally applied avatar until Firebase profile updates are connected. */
  protected readonly localProfileAvatarUrl = signal('');

  /** Indicates whether the avatar selection differs from the current edit draft. */
  protected readonly hasAvatarSelectionChanged = computed(
    () => this.selectedAvatarUrl() !== this.draftAvatarUrl()
  );

  /** Indicates whether the profile is being edited. */
  protected readonly isEditMode = computed(
    () => this.profileMode() === 'edit'
  );

  /** Indicates whether the avatar selection is open. */
  protected readonly isAvatarMode = computed(
    () => this.profileMode() === 'avatar'
  );

  /** Stores and validates the editable profile name. */
  protected readonly profileForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.pattern(/\S/)]],
  });

  /** Opens the profile in view mode. */
  public openProfileDialog(): void {
    this.profileName.set(this.currentUser()?.name ?? '');
    this.localProfileAvatarUrl.set(this.profileAvatarUrl());
    this.draftAvatarUrl.set(this.profileAvatarUrl());
    this.selectedAvatarUrl.set(this.profileAvatarUrl());
    this.profileMode.set('view');
    this.resetProfileForm();

    if (!this.profileDialog.nativeElement.open) {
      this.profileDialog.nativeElement.showModal();
    }
  }

  /** Closes the complete profile dialog. */
  protected closeProfileDialog(): void {
    const dialog = this.profileDialog.nativeElement;

    if (dialog.open) dialog.close();

    this.profileMode.set('view');
    this.resetProfileForm();
  }

  /** Switches to the profile editing view. */
  protected startProfileEditing(): void {
    this.resetProfileForm();
    this.draftAvatarUrl.set(this.localProfileAvatarUrl());
    this.selectedAvatarUrl.set(this.localProfileAvatarUrl());
    this.profileMode.set('edit');
  }

  /** Discards changes and returns to the profile view. */
  protected cancelProfileEditing(): void {
    this.resetProfileForm();
    this.draftAvatarUrl.set(this.localProfileAvatarUrl());
    this.selectedAvatarUrl.set(this.localProfileAvatarUrl());
    this.profileMode.set('view');
  }

  /** Checks whether the entered profile name differs from the current name. */
  protected hasNameChanged(): boolean {
    const fullName = this.profileForm.controls.fullName.value.trim();

    return fullName.length > 0 && fullName !== this.profileName();
  }

  /** Checks whether the profile edit contains any changes. */
  protected hasProfileChanges(): boolean {
    return (
      this.hasNameChanged() ||
      this.draftAvatarUrl() !== this.localProfileAvatarUrl()
    );
  }

  /** Checks whether the current profile changes can be saved. */
  protected canSaveProfile(): boolean {
    return this.profileForm.valid && this.hasProfileChanges();
  }

  /** TEMP-PROFILE-EDIT: Applies profile changes locally until Firebase updates are connected. */
  protected saveProfile(): void {
    if (!this.canSaveProfile()) return;

    const fullName = this.profileForm.controls.fullName.value.trim();

    if (this.hasNameChanged()) {
      this.profileName.set(fullName);
    }

    this.localProfileAvatarUrl.set(this.draftAvatarUrl());
    this.profileMode.set('view');
    this.resetProfileForm();
  }

  /** Closes the dialog when Escape is pressed. */
  protected handleProfileCancel(event: Event): void {
    event.preventDefault();
    this.closeProfileDialog();
  }

  /** Closes the dialog when its backdrop is clicked. */
  protected closeProfileFromBackdrop(event: MouseEvent): void {
    if (event.target === this.profileDialog.nativeElement) {
      this.closeProfileDialog();
    }
  }

  /** Restores the currently saved name in the form. */
  private resetProfileForm(): void {
    this.profileForm.reset({
      fullName: '',
    });
  }

  /** Opens the avatar selection without resetting profile edits. */
  protected openAvatarSelection(): void {
    this.selectedAvatarUrl.set(this.draftAvatarUrl());
    this.profileMode.set('avatar');
  }

  /** Selects an avatar for the current avatar preview. */
  protected selectAvatar(avatarUrl: string): void {
    this.selectedAvatarUrl.set(avatarUrl);
  }

  /** Returns to profile editing without discarding profile edits. */
  protected closeAvatarSelection(): void {
    this.profileMode.set('edit');
  }

  /** Confirms the selected avatar for the current profile edit. */
  protected confirmAvatarSelection(): void {
    if (!this.hasAvatarSelectionChanged()) return;

    this.draftAvatarUrl.set(this.selectedAvatarUrl());
    this.profileMode.set('edit');
  }
}
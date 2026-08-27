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
import { updateProfile, User } from 'firebase/auth';
import {
  doc,
  updateDoc,
  type DocumentData,
  type UpdateData,
} from 'firebase/firestore';
import { firebaseAuth, firestore } from '../../core/firebase.config';

interface ProfileChanges {
  fullName: string;
  nameChanged: boolean;
  avatarChanged: boolean;
}

interface AuthProfileUpdates {
  displayName?: string;
  photoURL?: string;
}

/** Defines valid partial field updates for a Firestore document. */
type FirestoreProfileUpdates = UpdateData<DocumentData>;

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

  /** Provides authentication and shared user data. */
  private readonly authService = inject(Auth);

  /** Provides the currently authenticated user. */
  protected readonly currentUser = this.authService.currentUser;

  /** Creates the reactive profile form. */
  private readonly formBuilder = inject(FormBuilder);

  /** Stores the currently displayed profile view. */
  private readonly profileMode = signal<'view' | 'edit' | 'avatar'>('view');

  /** Provides the current profile name. */
  protected readonly profileName = computed(
    () => this.currentUser()?.name ?? ''
  );

  /** Provides the current profile email address. */
  protected readonly profileEmail = computed(
    () => this.currentUser()?.email ?? ''
  );

  /** Provides the current profile avatar. */
  protected readonly profileAvatarUrl = computed(
    () => this.currentUser()?.avatarUrl ?? 'assets/default-user-avatar.png'
  );

  /** Provides the current profile status. */
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
    this.draftAvatarUrl.set(this.profileAvatarUrl());
    this.selectedAvatarUrl.set(this.profileAvatarUrl());
    this.profileMode.set('edit');
  }

  /** Discards changes and returns to the profile view. */
  protected cancelProfileEditing(): void {
    this.resetProfileForm();
    this.draftAvatarUrl.set(this.profileAvatarUrl());
    this.selectedAvatarUrl.set(this.profileAvatarUrl());
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
      this.draftAvatarUrl() !== this.profileAvatarUrl()
    );
  }

  /** Checks whether the current profile changes can be saved. */
  protected canSaveProfile(): boolean {
    return this.profileForm.valid && this.hasProfileChanges();
  }

  /** Saves only the changed profile fields to Firebase. */
  protected async saveProfile(): Promise<void> {
    if (!this.canSaveProfile()) return;
    const user = this.currentUser();
    const firebaseUser = firebaseAuth.currentUser;
    if (!user || !firebaseUser || firebaseUser.uid !== user.uid) return;
    const changes = this.getProfileChanges();
    await this.updateFirestoreProfile(user.uid, changes);
    await this.updateAuthProfile(firebaseUser, changes);
    this.finishProfileSave();
  }

  /** Collects the changes made during the current profile edit. */
  private getProfileChanges(): ProfileChanges {
    const fullName = this.profileForm.controls.fullName.value.trim();
    return {
      fullName,
      nameChanged: this.hasNameChanged(),
      avatarChanged: this.draftAvatarUrl() !== this.profileAvatarUrl(),
    };
  }

  /** Updates only changed profile fields in Firestore. */
  private async updateFirestoreProfile(
    userId: string,
    changes: ProfileChanges
  ): Promise<void> {
    const updates = this.createFirestoreUpdates(changes);
    await updateDoc(doc(firestore, 'users', userId), updates);
  }

  /** Creates the changed fields for the Firestore profile update. */
  private createFirestoreUpdates(
    changes: ProfileChanges
  ): FirestoreProfileUpdates {
    const updates: FirestoreProfileUpdates = {};
    if (changes.nameChanged) updates['name'] = changes.fullName;
    if (changes.avatarChanged) updates['avatarUrl'] = this.draftAvatarUrl();
    return updates;
  }

  /** Updates only changed fields in the Firebase Auth profile. */
  private async updateAuthProfile(
    user: User,
    changes: ProfileChanges
  ): Promise<void> {
    const updates = this.createAuthUpdates(changes);
    await updateProfile(user, updates);
  }

  /** Creates the changed fields for the Firebase Auth profile update. */
  private createAuthUpdates(
    changes: ProfileChanges
  ): AuthProfileUpdates {
    const updates: AuthProfileUpdates = {};
    if (changes.nameChanged) updates.displayName = changes.fullName;
    if (changes.avatarChanged) updates.photoURL = this.draftAvatarUrl();
    return updates;
  }

  /** Returns to the profile view after saving successfully. */
  private finishProfileSave(): void {
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

  /** Resets the editable profile form. */
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
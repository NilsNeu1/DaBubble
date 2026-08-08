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

  private readonly formBuilder = inject(FormBuilder);
  private readonly profileMode = signal<'view' | 'edit'>('view');

  /** TEMP-HEADER-PREVIEW: Replace with Firebase profile data. */
  protected readonly profileName = signal('Header Testuser');

  /** TEMP-HEADER-PREVIEW: Replace with Firebase authentication data. */
  protected readonly profileEmail = 'header.test@example.com';

  /** TEMP-HEADER-PREVIEW: Replace with the saved Firebase avatar. */
  protected readonly profileAvatarUrl =
    'assets/default-user-avatar.png';

  /** TEMP-HEADER-PREVIEW: Replace with the actual user status. */
  protected readonly profileStatus = 'online';

  /** Indicates whether the profile is being edited. */
  protected readonly isEditMode = computed(
    () => this.profileMode() === 'edit'
  );

  /** Stores and validates the editable profile name. */
  protected readonly profileForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.pattern(/\S/)]],
  });

  /** Opens the profile in view mode. */
  public openProfileDialog(): void {
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
    this.profileMode.set('edit');
  }

  /** Discards changes and returns to the profile view. */
  protected cancelProfileEditing(): void {
    this.resetProfileForm();
    this.profileMode.set('view');
  }

  /** Saves the temporary profile name. */
  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const fullName =
      this.profileForm.controls.fullName.value.trim();

    this.profileName.set(fullName);
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
}
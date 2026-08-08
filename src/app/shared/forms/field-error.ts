import { AbstractControl } from '@angular/forms';

export function fieldError(control: AbstractControl | null): string | null {
  if (!control || !control.touched || control.valid) {
    return null;
  }

  if (control.hasError('required')) {
    return 'Dieses Feld ist erforderlich.';
  }
  if (control.hasError('email')) {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }
  if (control.hasError('minlength')) {
    const requiredLength = control.getError('minlength').requiredLength;
    return `Muss mindestens ${requiredLength} Zeichen lang sein.`;
  }
  if (control.hasError('passwordMismatch')) {
    return 'Die Passwörter stimmen nicht überein.';
  }
  if (control.hasError('requiredTrue')) {
    return 'Bitte stimme zu, um fortzufahren.';
  }

  return null;
}

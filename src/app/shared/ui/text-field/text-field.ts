import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type TextFieldIcon = 'email' | 'password' | 'person' | 'tag' | 'none';

const ICON_SRC: Record<TextFieldIcon, string | null> = {
  email: 'assets/mail-grey.png',
  password: 'assets/lock-grey.png',
  person: 'assets/user-name-icon-grey.png',
  tag: 'assets/tag_grey.png',
  none: null,
};

@Component({
  selector: 'app-text-field',
  imports: [],
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextField),
      multi: true,
    },
  ],
})
export class TextField implements ControlValueAccessor {
  readonly icon = input<TextFieldIcon>('none');
  readonly placeholder = input('');
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly showPasswordToggle = input(true);
  readonly errorMessage = input<string | null>(null);

  readonly value = signal('');
  readonly disabled = signal(false);
  readonly passwordVisible = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  get iconSrc(): string | null {
    return ICON_SRC[this.icon()];
  }

  get resolvedType(): string {
    if (this.type() !== 'password') {
      return this.type();
    }
    return this.passwordVisible() ? 'text' : 'password';
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  handleBlur(): void {
    this.onTouched();
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}

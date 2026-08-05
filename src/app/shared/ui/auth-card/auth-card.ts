import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-card',
  imports: [RouterLink],
  templateUrl: './auth-card.html',
  styleUrl: './auth-card.scss',
})
export class AuthCard {
  readonly title = input('');
  readonly titleLine2 = input('');
  readonly showBackButton = input(false);
  readonly back = output<void>();
}

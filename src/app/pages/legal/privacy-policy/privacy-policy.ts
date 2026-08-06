import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Header } from '../../../components/header/header';

@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink, Header],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.scss',
})
export class PrivacyPolicy {
  private readonly location = inject(Location);

  /** Returns to the previously visited page. */
  protected goBack(): void {
    this.location.back();
  }
}
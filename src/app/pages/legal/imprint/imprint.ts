import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Header } from '../../../components/header/header';

@Component({
  selector: 'app-imprint',
  imports: [RouterLink, Header],
  templateUrl: './imprint.html',
  styleUrl: './imprint.scss',
})
export class Imprint {
  private readonly location = inject(Location);

  /** Returns to the previously visited page. */
  protected goBack(): void {
    this.location.back();
  }
}
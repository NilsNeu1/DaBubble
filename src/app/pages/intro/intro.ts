import { Component } from '@angular/core';
import { Login } from '../login/login';

@Component({
  selector: 'app-intro',
  imports: [Login],
  templateUrl: './intro.html',
  styleUrl: './intro.scss',
})
export class Intro {
}

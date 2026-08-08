import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatPanel } from './components/chat-panel/chat-panel';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatPanel],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}

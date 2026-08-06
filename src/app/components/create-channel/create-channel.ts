import { Component, Input, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-channel',
  imports: [FormsModule, CommonModule],
  templateUrl: './create-channel.html',
  styleUrl: './create-channel.scss',
})
export class CreateChannel {
  channelName: string = '';
  channelDescription: string = '';
  @Input() isOverlayOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  checkInput() {
    if (this.channelName === '') {
      return;
    }
    this.createChannel()
  }

  createChannel() {
  }

  closeOverlay() {
    this.close.emit();
  }
}

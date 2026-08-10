import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-group-details-overlay-component',
  imports: [CommonModule],
  templateUrl: './group-details-overlay-component.html',
  styleUrl: './group-details-overlay-component.scss',
})
export class GroupDetailsOverlayComponent {
  @Output() close = new EventEmitter<void>();
  isOverlayOpen = false;
  channelId = '';

  open(channelId: string): void {
    this.channelId = channelId;
    this.isOverlayOpen = true;
  }
  
  leaveChat() {
    this.isOverlayOpen = false;
  }
}

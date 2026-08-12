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

  /** Opens the selected channel details. */
  open(channelId: string): void {
    this.channelId = channelId;
    this.isOverlayOpen = true;
  }

  /** Closes the channel details overlay. */
  closeOverlay(): void {
    this.isOverlayOpen = false;
    this.close.emit();
  }

  /** Closes the overlay after leaving the channel. */
  leaveChat(): void {
    this.closeOverlay();
  }
}

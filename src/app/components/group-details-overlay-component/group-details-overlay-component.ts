import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatModel } from '../../core/chat.model';
import { Auth } from '../../core/services/auth';

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
  channelDetails = inject(ChatModel).activeChat;
  allUsers = inject(Auth).allUsers;

  /** Opens the selected channel details. */
  open(channelId: string): void {
    this.channelId = channelId;
    this.isOverlayOpen = true;
    console.log(this.channelDetails);
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

  getCreater(userId: string): string {
    return this.allUsers().find(user => user.uid === userId)?.name ?? '';
  }
}

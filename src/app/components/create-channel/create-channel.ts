import { Component, Input, EventEmitter, Output, inject } from '@angular/core';
import { Auth } from '../../core/services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../core/firebase.config';

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
  currentUser = inject(Auth).currentUser;
  allUsers = inject(Auth).allUsers;

  checkInput() {
    if (this.channelName === '') {
      return;
    }
    this.createChannel()
    this.closeOverlay()
  }

  async createChannel() {
    await this.addChannelToUser();
  }

  closeOverlay() {
    this.close.emit();
  }

  async addChannelToUser(): Promise<void> {
    const userId = this.currentUser()?.uid;
    if (!userId) {
      return;
    }
    const userRef = doc(firestore, 'users', userId);

    await updateDoc(userRef, {
      [`channelMemberships.${this.channelName}`]: {
        channelId: this.channelName,
        channelName: this.channelName,
        role: 'admin',
      },
    });
  }

  
}

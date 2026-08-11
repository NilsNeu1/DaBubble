import { Component, Input, EventEmitter, Output, inject } from '@angular/core';
import { Auth } from '../../core/services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
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
    await this.addChannelToFirestore();
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

  async addChannelToFirestore(): Promise<void> {

    const groupData = {
      channelId: this.channelName, // später ändeern
      createdBy: this.currentUser()?.uid,
      channelName: this.channelName,
      description: this.channelDescription,
      members: [{
        userId: this.currentUser()?.uid,
        role: 'admin',
        name: this.currentUser()?.name,
      }],
      messages: [{//kann mann später in die chat component packen
        createdAt: new Date(),
        reactions: [],
        replyToMessageId: null,
        senderId: '',
        text: 'hat geklapt',
      }]
    };

    const documentReference = await addDoc(
      collection(firestore, 'chats'),
      groupData
    );

    console.log('Gruppen-ID:', documentReference.id);
  }


}

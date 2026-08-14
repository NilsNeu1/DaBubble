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
  styleUrls: ['./create-channel.scss', './add-user-dropdown.scss'],
})
export class CreateChannel {
  channelName: string = '';
  channelDescription: string = '';
  @Input() isOverlayOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  isAddMembersOpen: boolean = false;
  isChecked: string = 'existing';
  currentUser = inject(Auth).currentUser;
  allUsers = inject(Auth).allUsers;
  members: { userId: string; role: string; name: string }[] = [];
  dropDownUSers:[] = [];

  checkInput() {
    if (this.channelName === '') {
      return;
    }
    this.createChannel()
    this.closeOverlay()
  }

  async createChannel() {
    const channelId = await this.addChannelToFirestore();
    await this.addChannelToUser(channelId);
  }

  closeOverlay() {
    this.close.emit();
    this.channelName = '';
    this.channelDescription = '';
    this.isChecked = 'existing';
    setTimeout(() => {
      this.isAddMembersOpen = false;
    }, 300);
  }

  async addChannelToUser(channelId: string): Promise<void> {
    const userId = this.currentUser()?.uid;
    if (!userId) {
      return;
    }
    const userRef = doc(firestore, 'users', userId);

    await updateDoc(userRef, {
      [`channelMemberships.${this.channelName}`]: {
        channelId: channelId,
        channelName: this.channelName,
        role: 'admin',
      },
    });
  }

  async addChannelToFirestore(): Promise<string> {
    const documentReference = await addDoc(
      collection(firestore, 'chats'),
      {
        channelName: this.channelName,
        createdBy: this.currentUser()?.uid,
        description: this.channelDescription,
        members: this.getSelectedMembers(),
        messages: [],
      }
    );

    return documentReference.id;
  }

  toAddMembers() {
    this.isAddMembersOpen = true;
  }

  selectMemberSource(source: 'existing' | 'custom') {
    if (source === 'existing') {
      this.isChecked = 'existing';
    } else if (source === 'custom') {
      this.isChecked = 'custom';
    }
  }

  getSelectedMembers() {
    if (this.isChecked === 'existing') {
      return [
        {
          userId: this.currentUser()?.uid,
          role: 'admin',
          name: this.currentUser()?.name,
        }
      ];

    } if (this.isChecked === 'custom') {
      return this.members;
    }
    else {
      return [
        {
          userId: this.currentUser()?.uid,
          role: 'admin',
          name: this.currentUser()?.name,
        }
      ];
    }
  }
}

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatModel } from '../../core/chat.model';
import { Auth } from '../../core/services/auth';
import { deleteField, doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../core/firebase.config';
import { FormsModule } from '@angular/forms';
import { ChannelAddMembersDropdown } from '../channel-add-members-dropdown/channel-add-members-dropdown'

@Component({
  selector: 'app-group-details-overlay-component',
  imports: [CommonModule, FormsModule, ChannelAddMembersDropdown],
  templateUrl: './group-details-overlay-component.html',
  styleUrl: './group-details-overlay-component.scss',
})
export class GroupDetailsOverlayComponent {
  @Output() close = new EventEmitter<void>();
  isOverlayOpen = false;
  channelId = '';
  channelDetails = inject(ChatModel).activeChat;
  allUsers = inject(Auth).allUsers;
  currentUser = inject(Auth).currentUser;
  editing: boolean = false;
  editingField: 'channelName' | 'description' | null = null;
  channelName: string = '';
  description: string = '';
  errorInput: 'channelName' | 'description' | null = null;;
  chatModel = inject(ChatModel);

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
    this.editing = false;
    this.editingField = null;
    this.channelName = '';
    this.description = '';
    this.errorInput = null;
  }

  /** Closes the overlay after leaving the channel. */
  leaveChat(): void {
    this.closeOverlay();
    this.removeFromChannelFirebase(this.channelId);
    this.removeChannelFromUser(this.channelId);
  }

  getCreater(userId: string): string {
    return this.allUsers().find(user => user.uid === userId)?.name ?? '';
  }

  async removeFromChannelFirebase(channelId: string): Promise<void> {
    const channelRef = doc(firestore, 'chats', channelId);
    const channelSnap = await getDoc(channelRef);

    const members = channelSnap.data()?.['members'] ?? [];

    const updatedMembers = members.filter(
      (member: any) => member.uid !== this.currentUser()?.uid
    );

    await updateDoc(channelRef, {
      members: updatedMembers
    });
  }

  async removeChannelFromUser(channelId: string): Promise<void> {
    const userId = this.currentUser()?.uid;

    if (!userId) {
      return;
    }

    const userRef = doc(firestore, 'users', userId);

    await updateDoc(userRef, {
      [`channelMemberships.${channelId}`]: deleteField()
    });

  }

  editChannelName() {
    if (this.editing === true && this.editingField === 'channelName') {
      if (this.channelName === '') {
        this.triggerError('channelName')
        return;
      }
      this.updateFirebase('channelName');
      this.editing = false;
      this.editingField = null;
      return;
    }
    this.editing = true;
    this.editingField = 'channelName';
  }

  editDescription() {
    if (this.editing === true && this.editingField === 'description') {
      if (this.description === '') {
        this.triggerError('description')
        return;
      }
      this.updateFirebase('description');
      this.editing = false;
      this.editingField = null;
      return;
    }
    this.editing = true;
    this.editingField = 'description';
  }

  async updateFirebase(field: 'channelName' | 'description'): Promise<void> {
    const channelRef = doc(firestore, 'chats', this.channelId);
    if (field === 'channelName') {
      await updateDoc(channelRef, {
        channelName: this.channelName
      });
    } else if (field === 'description') {
      await updateDoc(channelRef, {
        description: this.description
      });
    }
    this.errorInput = null;
    await this.chatModel.getChannels(Object.keys(this.currentUser()?.channelMemberships ?? {}));
  }

  triggerError(field: 'channelName' | 'description') {
    this.errorInput = field;
  }
}

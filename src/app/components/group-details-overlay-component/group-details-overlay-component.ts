import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatModel } from '../../core/chat.model';
import { Auth } from '../../core/services/auth';
import { deleteField, doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../core/firebase.config';

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
  currentUser = inject(Auth).currentUser;


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
}

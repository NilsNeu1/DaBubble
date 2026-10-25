import { Component, EventEmitter, HostListener, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { arrayUnion, deleteField, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ChatModel } from '../../core/chat.model';
import { Auth } from '../../core/services/auth';
import { firestore } from '../../core/firebase.config';

/** Displays channel details and manages editing, member selection, and leaving a channel. */
@Component({
  selector: 'app-group-details-overlay-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './group-details-overlay-component.html',
  styleUrls: [
    '../create-channel/add-user-dropdown.scss',
    './group-details-overlay-component.scss',
  ],
})
export class GroupDetailsOverlayComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  isOverlayOpen = false;
  isMobile = false;
  channelId = '';
  channelDetails = inject(ChatModel).activeChat;
  allUsers = inject(Auth).allUsers;
  currentUser = inject(Auth).currentUser;
  editing = false;
  editingField: 'channelName' | 'description' | null = null;
  channelName = '';
  description = '';
  errorInput: 'channelName' | 'description' | null = null;
  chatModel = inject(ChatModel);
  addUserOverlay = signal(false);
  members: { uid: string; role: string; name: string; avatarUrl: string }[] = [];
  dropDownUsers: { name: string; avatarUrl: string; uid: string }[] = [];
  selectedUser = '';
  isAddingMembers = false;

  /** Initializes the layout flag from the current window width. */
  ngOnInit(): void {
    this.onResize();
  }

  /** Checks whether a user already belongs to the current channel. */
  private isAlreadyChannelMember(userId: string): boolean {
    return this.channelDetails()?.members.some(member => member.uid === userId) ?? false;
  }

  /** Opens the details overlay for the specified channel. */
  open(channelId: string): void {
    this.channelId = channelId;
    this.isOverlayOpen = true;
  }

  /** Closes overlays and resets editing and member selection. */
  closeOverlay(): void {
    this.isOverlayOpen = false;
    this.close.emit();
    this.editing = false;
    this.editingField = null;
    this.channelName = '';
    this.description = '';
    this.errorInput = null;
    this.addUserOverlay.set(false);
    this.members = [];
  }

  /** Closes the overlay and starts both channel membership removals. */
  leaveChat(): void {
    this.closeOverlay();
    this.removeFromChannelFirebase(this.channelId);
    this.removeChannelFromUser(this.channelId);
  }

  /** Returns the current name of the channel creator. */
  getCreater(userId: string): string {
    return this.allUsers().find(user => user.uid === userId)?.name ?? '';
  }

  /** Removes the signed-in user from the channel member list in Firestore. */
  async removeFromChannelFirebase(channelId: string): Promise<void> {
    const channelRef = doc(firestore, 'chats', channelId);
    const channelSnap = await getDoc(channelRef);
    const members = channelSnap.data()?.['members'] ?? [];
    const updatedMembers = members.filter((member: any) => member.uid !== this.currentUser()?.uid);
    await updateDoc(channelRef, { members: updatedMembers });
  }

  /** Removes a channel membership from the signed-in user's Firestore profile. */
  async removeChannelFromUser(channelId: string): Promise<void> {
    const userId = this.currentUser()?.uid;
    if (!userId) return;
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, { [`channelMemberships.${channelId}`]: deleteField() });
  }

  /** Starts or finishes editing the channel name. */
  editChannelName(): void {
    if (this.editing && this.editingField === 'channelName') {
      this.saveEditedField('channelName', this.channelName);
      return;
    }
    this.channelName = this.channelDetails()?.channelName ?? '';
    this.startEditing('channelName');
  }

  /** Starts or finishes editing the channel description. */
  editDescription(): void {
    if (this.editing && this.editingField === 'description') {
      this.saveEditedField('description', this.description);
      return;
    }
    this.description = this.channelDetails()?.description ?? '';
    this.startEditing('description');
  }

  /** Sets the currently edited field without changing the other field value. */
  private startEditing(field: 'channelName' | 'description'): void {
    this.editing = true;
    this.editingField = field;
  }

  /** Validates and submits the selected field without awaiting its update. */
  private saveEditedField(field: 'channelName' | 'description', value: string): void {
    if (value === '') {
      this.triggerError(field);
      return;
    }
    this.updateFirebase(field);
    this.editing = false;
    this.editingField = null;
  }

  /** Saves a channel field and refreshes the signed-in user's channel list. */
  async updateFirebase(field: 'channelName' | 'description'): Promise<void> {
    const channelRef = doc(firestore, 'chats', this.channelId);
    if (field === 'channelName') {
      await updateDoc(channelRef, { channelName: this.channelName });
    } else if (field === 'description') {
      await updateDoc(channelRef, { description: this.description });
    }
    this.errorInput = null;
    await this.chatModel.getChannels(Object.keys(this.currentUser()?.channelMemberships ?? {}));
  }

  /** Marks an edited channel field as invalid. */
  triggerError(field: 'channelName' | 'description'): void {
    this.errorInput = field;
  }

  /** Returns the user's current online or offline status. */
  getUserStatus(uid: string): 'online' | 'offline' {
    return this.allUsers().find(user => user.uid === uid)?.status ?? 'offline';
  }

  /** Closes the member selector and clears its temporary state. */
  closeAddUserOverlay(): void {
    this.addUserOverlay.set(false);
    this.members = [];
    this.dropDownUsers = [];
    this.selectedUser = '';
    this.errorInput = null;
    this.isAddingMembers = false;
  }

  /** Opens the member selection overlay. */
  addMember(): void {
    this.addUserOverlay.set(true);
  }

  /** Removes a user only from the unsaved local selection. */
  removeUserFromChannel(member: { uid: string; role: string; name: string; avatarUrl: string }): void {
    this.members = this.members.filter(selected => selected.uid !== member.uid);
  }

  /** Filters users who are not the current user, a member, or already selected. */
  filterUsers(): void {
    this.dropDownUsers = this.allUsers().filter(user =>
      user.name.toLowerCase().includes(this.selectedUser.toLowerCase()) &&
      user.uid !== this.currentUser()?.uid &&
      !this.isAlreadyChannelMember(user.uid) &&
      !this.members.some(member => member.uid === user.uid)
    );
  }

  /** Adds an unselected user to the local channel member selection. */
  selectUser(user: { name: string; avatarUrl: string; uid: string }): void {
    this.selectedUser = '';
    if (this.members.some(member => member.uid === user.uid)) return;
    this.members.push({
      uid: user.uid, role: 'member', name: user.name, avatarUrl: user.avatarUrl,
    });
  }

  /** Adds channel members and their user memberships in the original order. */
  async addUserToChannel(): Promise<void> {
    this.isAddingMembers = true;
    const channelId = this.channelId;
    await this.saveSelectedMembersToChannel(channelId);
    await this.saveChannelMemberships(channelId);
    this.closeAddUserOverlay();
    this.isAddingMembers = false;
  }

  /** Saves each selected member to the channel sequentially. */
  private async saveSelectedMembersToChannel(channelId: string): Promise<void> {
    const channelRef = doc(firestore, 'chats', channelId);
    for (let i = 0; i < this.members.length; i++) {
      await updateDoc(channelRef, {
        members: arrayUnion({
          avatarUrl: this.members[i].avatarUrl, name: this.members[i].name,
          role: 'member', uid: this.members[i].uid,
        })
      });
    }
  }

  /** Saves each selected user's channel membership sequentially. */
  private async saveChannelMemberships(channelId: string): Promise<void> {
    for (let i = 0; i < this.members.length; i++) {
      await this.addChannelToUser(channelId, this.members[i].uid);
    }
  }

  /** Saves the new channel membership in the selected user's document. */
  async addChannelToUser(channelId: string, userId: string): Promise<void> {
    if (!userId) return;
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, { [`channelMemberships.${channelId}`]: { channelId } });
  }

  /** Updates the mobile layout flag when the window width changes. */
  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= 1024;
  }
}

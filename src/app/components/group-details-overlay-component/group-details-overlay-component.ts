import { Component, Input, Output, EventEmitter, inject, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatModel } from '../../core/chat.model';
import { Auth } from '../../core/services/auth';
import { deleteField, doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../core/firebase.config';
import { FormsModule } from '@angular/forms';
import { arrayUnion } from 'firebase/firestore';

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
  editing: boolean = false;
  editingField: 'channelName' | 'description' | null = null;
  channelName: string = '';
  description: string = '';
  errorInput: 'channelName' | 'description' | null = null;;
  chatModel = inject(ChatModel);
  addUserOverlay = signal(false);
  members: { uid: string; role: string; name: string; avatarUrl: string }[] = [];
  dropDownUsers: { name: string; avatarUrl: string; uid: string }[] = [];
  selectedUser: string = '';
  isAddingMembers = false;

  /** Initializes the layout flag from the current window width. */
  ngOnInit(): void {
    this.onResize();
  }

  /** Checks if a user is already a member of the current channel. */
  private isAlreadyChannelMember(userId: string): boolean {
  return this.channelDetails()?.members.some(
    member => member.uid === userId
  ) ?? false;
}

  /**
   * Opens the details overlay for the selected channel.
   * @param channelId ID used for subsequent channel updates.
   */
  open(channelId: string): void {
    this.channelId = channelId;
    this.isOverlayOpen = true;
  }

  /** Closes both overlays, emits the close event, and resets editing and selected members. */
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

  /** Closes the overlay and starts removing the current user's channel membership. */
  leaveChat(): void {
    this.closeOverlay();
    this.removeFromChannelFirebase(this.channelId);
    this.removeChannelFromUser(this.channelId);
  }

  /**
   * Looks up the channel creator's display name.
   * @param userId UID of the channel creator.
   * @returns The user's name, or an empty string if no user matches.
   */
  getCreater(userId: string): string {
    return this.allUsers().find(user => user.uid === userId)?.name ?? '';
  }

  /**
   * Removes the current user from the channel's stored member list.
   * @param channelId ID of the channel to update.
   */
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

  /**
   * Deletes a channel membership from the current user's document, if signed in.
   * @param channelId ID of the membership to remove.
   */
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

  /** Starts name editing or submits a nonempty name when already editing it. */
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

     this.channelName = this.channelDetails()?.channelName ?? '';
    this.editing = true;
    this.editingField = 'channelName';
  }

  /** Starts description editing or submits a nonempty description when already editing it. */
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

    this.description = this.channelDetails()?.description ?? '';
    this.editing = true;
    this.editingField = 'description';
  }

  /**
   * Saves an edited channel field, clears its error, and reloads the user's channel list.
   * @param field The channel field to update from the local form value.
   */
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

  /**
   * Marks a channel field as invalid for the template's error styling.
   * @param field The field with invalid input.
   */
  triggerError(field: 'channelName' | 'description') {
    this.errorInput = field;
  }

  /**
   * Looks up a member's current presence status.
   * @param uid UID of the user to look up.
   * @returns The user's status, defaulting to offline when unavailable.
   */
  getUserStatus(uid: string): 'online' | 'offline' {
    return this.allUsers().find(user => user.uid === uid)?.status ?? 'offline';
  }

  /** Closes member selection and resets the selection, search, error, and saving flag. */
  closeAddUserOverlay() {
    this.addUserOverlay.set(false);
    this.members = [];
    this.dropDownUsers = [];
    this.selectedUser = '';
    this.errorInput = null;
    this.isAddingMembers = false;
  }

  /** Opens the overlay for selecting additional channel members. */
  addMember() {
    this.addUserOverlay.set(true);
  }

  /**
   * Removes a user from the local selection without changing stored channel members.
   * @param member The selected member to remove by UID.
   */
  removeUserFromChannel(member: { uid: string; role: string; name: string; avatarUrl: string }) {
    this.members = this.members.filter(m => m.uid !== member.uid);
  }

  /** Filters users by name, excluding the current user and users already selected locally. */
filterUsers() {
  this.dropDownUsers = this.allUsers().filter(user =>
    user.name.toLowerCase().includes(this.selectedUser.toLowerCase()) &&
    user.uid !== this.currentUser()?.uid &&
    !this.isAlreadyChannelMember(user.uid) &&
    !this.members.some(member => member.uid === user.uid)
  );
}

  /**
   * Clears the search and adds a user to the local selection unless already selected.
   * @param user The user to add with the member role.
   */
  selectUser(user: { name: string; avatarUrl: string; uid: string }) {
    this.selectedUser = '';
    if (this.members.some(member => member.uid === user.uid)) { return }
    this.members.push({
      uid: user.uid,
      role: 'member',
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  }

  /** Saves selected channel members, updates their memberships, and closes selection on success. */
  async addUserToChannel() {
    this.isAddingMembers = true;
    const channelId = this.channelId;
    const channelRef = doc(firestore, 'chats', channelId);

    for (let i = 0; i < this.members.length; i++) {
      await updateDoc(channelRef, {
        members: arrayUnion({
          avatarUrl: this.members[i].avatarUrl,
          name: this.members[i].name,
          role: 'member',
          uid: this.members[i].uid,
        }),
      });
    }

    for (let i = 0; i < this.members.length; i++) {
      await this.addChannelToUser(channelId, this.members[i].uid);
    }

    this.closeAddUserOverlay()
    this.isAddingMembers = false;
  }

  /**
   * Adds the channel to the specified user's membership map.
   * @param channelId ID of the channel to add.
   * @param userId UID of the user to update; empty IDs are ignored.
   */
  async addChannelToUser(channelId: string, userId: string): Promise<void> {
    if (!userId) {
      return;
    }
    const userRef = doc(firestore, 'users', userId);

    await updateDoc(userRef, {
      [`channelMemberships.${channelId}`]: {
        channelId: channelId,
      },
    });
  }

  /** Updates the mobile layout flag when the window is resized. */
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth <= 1024) {
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }
  }
}

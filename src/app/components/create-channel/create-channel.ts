import { Component, Input, EventEmitter, Output, inject } from '@angular/core';
import { Auth } from '../../core/services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { doc, updateDoc, addDoc, collection, getDoc } from 'firebase/firestore';
import { firestore } from '../../core/firebase.config';
import { HostListener } from '@angular/core';
import { ChatModel } from '../../core/chat.model';


/** Manages channel creation and the selection of initial channel members. */
@Component({
  selector: 'app-create-channel',
  imports: [FormsModule, CommonModule],
  templateUrl: './create-channel.html',
  styleUrls: ['./create-channel.scss', './add-user-dropdown.scss'],
})
export class CreateChannel {
  isAddingMembers: boolean = false;
  channelName: string = '';
  channelDescription: string = '';

  @Input() isOverlayOpen: boolean = false;
  @Output() close = new EventEmitter<void>();

  isAddMembersOpen: boolean = false;
  isChecked: string = 'existing';

  currentUser = inject(Auth).currentUser;
  allUsers = inject(Auth).allUsers;
  chatModel = inject(ChatModel);

  selectedUser: string = '';
  members: { uid: string; role: string; name: string; avatarUrl: string }[] = [];
  existingMembers: { uid: string; role: string; name: string; avatarUrl: string }[] = [];
  dropDownUsers: { name: string; avatarUrl: string; uid: string }[] = [];
  topChannelID: string = '';
  topChannelName: string = 'Keine Channels gefunden';

  isMobile = window.innerWidth <= 1024;

  /** Updates body scrolling when the overlay input changes. */
  ngOnChanges(changes: any): void {
    if (this.isOverlayOpen === true) {
      document.body.style.overflow = 'hidden';
    } if (this.isOverlayOpen === false) {
      document.body.style.overflow = '';
    }
  }

  /** Updates the mobile layout flag when the window is resized. */
  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= 1024;
  }

  /** Starts channel creation when the channel name is not empty. */
  checkInput() {
    if (this.channelName === '') {
      return;
    }
    this.isAddingMembers = true;
    this.createChannel()
  }

  /** Creates the channel, updates the selected users' memberships, and closes the overlay. */
  async createChannel() {
    const channelId = await this.addChannelToFirestore();

    const selectedMembers =
      this.isChecked === 'existing'
        ? this.existingMembers
        : this.members;

    for (let i = 0; i < selectedMembers.length; i++) {
      await this.addChannelToUser(channelId, selectedMembers[i].uid);
    }

    this.closeOverlay();
  }

  /** Emits the close event, resets form values, and restores body scrolling. */
  closeOverlay() {
    this.close.emit();
    this.channelName = '';
    this.channelDescription = '';
    this.isChecked = 'existing';
    this.members = [];
    this.existingMembers = [];
    this.selectedUser = '';
    this.topChannelID = '';
    document.body.style.overflow = '';
    this.isAddingMembers = false;

    setTimeout(() => {
      this.isAddMembersOpen = false;
    }, 300);
  }

  /**
   * Adds the channel to the specified user's membership map.
   * @param channelId ID of the channel to add.
   * @param userId ID of the user to update; empty IDs are ignored.
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

  /**
   * Stores a new channel with its details and selected members in Firestore.
   * @returns The ID of the created channel document.
   */
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

  /** Opens member selection and loads the first available channel's members. */
  async toAddMembers() {
    this.getFirstChannel();
    await this.getMembersFromChannel(this.topChannelID);
    this.isAddMembersOpen = true;
  }

  /**
   * Selects whether to reuse existing members or choose users individually.
   * @param source The member selection mode.
   */
  selectMemberSource(source: 'existing' | 'custom') {
    if (source === 'existing') {
      this.isChecked = 'existing';
    } else if (source === 'custom') {
      this.isChecked = 'custom';
    }
  }

  /**
   * Returns the initial members for the selected mode.
   * In custom mode, appends the current user as an admin to the selection.
   */
  getSelectedMembers() {
    if (this.isChecked === 'existing') {
      return this.existingMembers;

    } if (this.isChecked === 'custom') {
      this.members.push({
        uid: this.currentUser()?.uid || '',
        role: 'admin',
        name: this.currentUser()?.name || '',
        avatarUrl: this.currentUser()?.avatarUrl || '',
      });
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

  /** Filters users by name, excluding the current user and users already selected. */
  filterUsers() {
    this.dropDownUsers = this.allUsers().filter(user =>
      user.name.toLowerCase().includes(this.selectedUser.toLowerCase()) &&
      user.uid !== this.currentUser()?.uid &&
      user.uid !== this.members.find(member => member.uid === user.uid)?.uid
    );
  }

  /**
   * Clears the search and adds a user to the custom selection unless already selected.
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

  /**
   * Removes a user from the local selection without changing Firestore.
   * @param member The selected member to remove by UID.
   */
  removeUserFromChannel(member: { uid: string; role: string; name: string; avatarUrl: string }) {
    this.members = this.members.filter(m => m.uid !== member.uid);
  }

  /** Reads the first membership and switches to custom selection if no channel name is available. */
  getFirstChannel() {
    const channel = this.chatModel.channels()[0];

    this.topChannelID = channel?.channelId ?? '';
    this.topChannelName = channel?.channelName ?? 'Keine Channels gefunden';

    if (!channel) {
      this.isChecked = 'custom';
    }
  }

  /**
   * Loads existing members from a channel document when it exists.
   * @param channelID ID of the source channel; falsy values are ignored.
   */
  async getMembersFromChannel(channelID: any) {
    if (channelID) {
      const channelRef = doc(firestore, 'chats', channelID);
      const channelSnap = await getDoc(channelRef);

      if (channelSnap.exists()) {
        const data = channelSnap.data()?.['members'] ?? [];;

        this.existingMembers = data;
      }
    }
  }
}

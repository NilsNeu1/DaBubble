import { Component, Input, EventEmitter, Output, inject } from '@angular/core';
import { Auth } from '../../core/services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { doc, updateDoc, addDoc, collection, getDoc } from 'firebase/firestore';
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

  selectedUser: string = '';
  members: { uid: string; role: string; name: string; avatarUrl: string }[] = [];
  existingMembers: { uid: string; role: string; name: string; avatarUrl: string }[] = [];
  dropDownUsers: { name: string; avatarUrl: string; uid: string }[] = [];
  topChannelID: string = '';
  topChannelName: string = 'No channels found';

  checkInput() {
    if (this.channelName === '') {
      return;
    }
    this.createChannel()
  }

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

  closeOverlay() {
    this.close.emit();
    this.channelName = '';
    this.channelDescription = '';
    this.isChecked = 'existing';
    this.members = [];
    this.existingMembers = [];
    this.selectedUser = '';
    this.topChannelID = '';

    setTimeout(() => {
      this.isAddMembersOpen = false;
    }, 300);
  }

  async addChannelToUser(channelId: string, userId: string): Promise<void> {
    if (!userId) {
      console.log('User ID is undefined. Cannot add channel to user.');
      return;
    }
    const userRef = doc(firestore, 'users', userId);

    await updateDoc(userRef, {
      [`channelMemberships.${channelId}`]: {
        channelId: channelId,
        channelName: this.channelName,
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

  async toAddMembers() {
    this.isAddMembersOpen = true;
    this.getFirstChannel();
    await this.getMembersFromChannel(this.topChannelID);
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

  filterUsers() {
    this.dropDownUsers = this.allUsers().filter(user =>
      user.name.toLowerCase().includes(this.selectedUser.toLowerCase()) &&
      user.uid !== this.currentUser()?.uid
    );
  }

  selectUser(user: { name: string; avatarUrl: string; uid: string }) {
    this.selectedUser = '';
    this.members.push({
      uid: user.uid,
      role: 'member',
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  }

  removeUserFromChannel(member: { uid: string; role: string; name: string; avatarUrl: string }) {
    this.members = this.members.filter(m => m.uid !== member.uid);
  }

  getFirstChannel() {
    const channel = Object.values(this.currentUser()?.channelMemberships ?? {})[0];
    this.topChannelID = channel?.channelId || '';

    this.topChannelName = channel?.channelName || 'No channels found';

    if(this.topChannelName === 'No channels found') {
      this.isChecked = 'custom';
    }
  }

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

import { Injectable, signal } from '@angular/core';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../app/core/firebase.config';

export interface chatModel {
  channelId: string;
  createdBy: string;
  description: string;
  name: string;

}

@Injectable({
  providedIn: 'root',
})

export class ChatModel {

  readonly activeChat = signal<chatModel | null>(null);

  async loadChat(channelId: string): Promise<void> {
    const chatRef = doc(firestore, 'chats', channelId);

    onSnapshot(chatRef, (snapshot) => {
      if (!snapshot.exists()) {
        this.activeChat.set(null);
        return;
      }

      this.activeChat.set(snapshot.data() as chatModel);
    });
    console.log('activeChat:', this.activeChat());
  }
}

import { Injectable, signal } from '@angular/core';
import { doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { firestore } from '../../app/core/firebase.config';

export interface chatModel {
  createdBy: string;
  description: string;
  channelName: string;

  members: unknown[];
  messages: unknown[];
}

@Injectable({
  providedIn: 'root',
})

export class ChatModel {

  readonly activeChat = signal<chatModel | null>(null);
  private unsubscribeChat?: Unsubscribe;

  async loadChat(channelId: string): Promise<void> {
    this.unsubscribeChat?.();

    const chatRef = doc(firestore, 'chats', channelId);

    this.unsubscribeChat = onSnapshot(chatRef, (snapshot) => {
      if (!snapshot.exists()) {
        this.activeChat.set(null);
        return;
      }

      this.activeChat.set(snapshot.data() as chatModel);
    });
    console.log('activeChat:', this.activeChat());
  }


  async getChat(channelId: string): Promise<chatModel | null> {
    const chatRef = doc(firestore, 'chats', channelId);
    const snapshot = await getDoc(chatRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as chatModel;
  }

}

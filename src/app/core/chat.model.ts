import { Injectable, signal } from '@angular/core';
import { doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { firestore } from '../../app/core/firebase.config';

export interface chatModel {
  createdBy: string;
  description: string;
  channelName: string;

  members: ChannelMember[];
}

export interface ChannelMember {
  uid: string;
  role: string;
  name: string;
  avatarUrl: string;
}

@Injectable({
  providedIn: 'root',
})

export class ChatModel {

  readonly activeChat = signal<chatModel | null>(null);
  private unsubscribeChat?: Unsubscribe;
  readonly channels = signal<
    { channelId: string; channelName: string }[]
  >([]);

  stopListening(): void {
    this.unsubscribeChat?.();
    this.unsubscribeChat = undefined;
    this.activeChat.set(null);
    this.channels.set([]);
  }

  async loadChat(channelId: string): Promise<void> {
    this.unsubscribeChat?.();

    const chatRef = doc(firestore, 'chats', channelId);

    this.unsubscribeChat = onSnapshot(chatRef, (snapshot) => {
      if (!snapshot.exists()) {             // If the document doesn't exist, set activeChat to null
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

  async getChannels(channelIds: string[]): Promise<void> {
    const channels = await Promise.all(
      channelIds.map(async channelId => {
        const channel = await this.getChat(channelId);

        return channel
          ? {
            channelId,
            channelName: channel.channelName,
          }
          : null;
      })
    );

    this.channels.set(
      channels.filter(
        (
          channel
        ): channel is { channelId: string; channelName: string } =>
          channel !== null
      )
    );
  }

}

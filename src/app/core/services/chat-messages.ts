import { Injectable, signal } from '@angular/core';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} 
from 'firebase/firestore';
import { firestore } from '../firebase.config';
import { ChatMessage, Reaction } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class ChatMessagesService {
  readonly messages = signal<ChatMessage[]>([]);
  private unsubscribeMessages?: Unsubscribe;

  loadMessages(channelId: string): void {
    this.unsubscribeMessages?.();

    const messagesRef = collection(firestore, 'chats', channelId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    this.unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      this.messages.set(messages);
    });
  }

  async sendMessage(
    channelId: string,
    message: Pick<ChatMessage, 'senderId' | 'senderName' | 'senderImageUrl' | 'text'>
  ): Promise<void> {
    const messagesRef = collection(firestore, 'chats', channelId, 'messages');
    await addDoc(messagesRef, {
      ...message,
      timestamp: Date.now(),
      hasThread: false,
      reactions: [],
    });
  }


  async addReaction(
    channelId: string,
    messageId: string,
    icon: string,
    currentReactions: Reaction[]
  ): Promise<void> {
    const existing = currentReactions.find((r) => r.icon === icon);
    const updatedReactions = existing
      ? currentReactions.map((r) =>
          r.icon === icon ? { ...r, count: r.count + 1 } : r
        )
      : [...currentReactions, { icon, count: 1 }];

    const messageRef = doc(firestore, 'chats', channelId, 'messages', messageId);
    await updateDoc(messageRef, { reactions: updatedReactions });
  }

  stopListening(): void {
    this.unsubscribeMessages?.();
    this.messages.set([]);
  }


  // dummy dummy dummy dummy
  // async seedDummyMessages(channelId: string): Promise<void> {
  //   const dummyMessages: Pick<ChatMessage, 'senderId' | 'senderName' | 'senderImageUrl' | 'text'>[] = [
  //     {
  //       senderId: 'l4N4HA2P7DNSkPbU5O2K6HfoeA72',
  //       senderName: 'Riccardo Schöpf',
  //       senderImageUrl: '/assets/01.Charaters.png',
  //       text: 'Hey zusammen, willkommen im Test-Channel!',
  //     },
  //     {
  //       senderId: 'tJYL0vjvUUSI47RiTooe6sLfShz2',
  //       senderName: 'Dominik Rapp',
  //       senderImageUrl: 'assets/default-user-avatar.png',
  //       text: 'Danke! Freue mich, dabei zu sein.',
  //     },
  //     {
  //       senderId: 'zgWtFKjdPmMxxLIQ2WztYTEODpo1',
  //       senderName: 'Nils Neumann',
  //       senderImageUrl: 'assets/default-user-avatar.png',
  //       text: 'Das ist meine eigene Nachricht als Test.',
  //     },
  //   ];

  //   for (const msg of dummyMessages) {
  //     await this.sendMessage(channelId, msg);
  //   }
  // }
  
  // dummy dummy dummy dummy
}

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

    const messagesRef = collection(firestore, 'chats', channelId, 'messages'); // points at the firestore Path
    const q = query(messagesRef, orderBy('timestamp', 'asc'));  // builds a query to order the messages by timestamp

    this.unsubscribeMessages = onSnapshot(q, (snapshot) => {  //firsttime load and then listen for changes in the messages collection
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

  async updateMessage(
  channelId: string,
  messageId: string,
  newText: string
): Promise<void> {
  const messageRef = doc(firestore, 'chats', channelId, 'messages', messageId);
  await updateDoc(messageRef, { text: newText });
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

}

import { Injectable, signal } from '@angular/core';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  where,
  Unsubscribe,
}
from 'firebase/firestore';
import { firestore } from '../firebase.config';
import { getDirectMessageId } from '../chat.model';
import { ChatMessage, Reaction, ReactionUser } from '../models/message.model';

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


  /**
   * Adds the given user's reaction if they haven't reacted with this icon yet, otherwise removes it (un-react).
   * Runs as a transaction so two users reacting at the same moment can't overwrite each other's change.
   */
  async toggleReaction(
    channelId: string,
    messageId: string,
    icon: string,
    user: ReactionUser
  ): Promise<void> {
    const messageRef = doc(firestore, 'chats', channelId, 'messages', messageId);

    await runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(messageRef);
      if (!snapshot.exists()) return;

      const currentReactions = (snapshot.data()['reactions'] ?? []) as Reaction[];
      const existing = currentReactions.find((r) => r.icon === icon);
      const alreadyReacted = existing?.reactedBy.some((u) => u.uid === user.uid) ?? false;

      let updatedReactions: Reaction[];
      if (existing && alreadyReacted) {
        const reactedBy = existing.reactedBy.filter((u) => u.uid !== user.uid);
        updatedReactions = reactedBy.length
          ? currentReactions.map((r) => (r.icon === icon ? { ...r, reactedBy } : r))
          : currentReactions.filter((r) => r.icon !== icon);
      } else if (existing) {
        updatedReactions = currentReactions.map((r) =>
          r.icon === icon ? { ...r, reactedBy: [...r.reactedBy, user] } : r
        );
      } else {
        updatedReactions = [...currentReactions, { icon, reactedBy: [user] }];
      }

      transaction.update(messageRef, { reactions: updatedReactions });
    });
  }

  /** Deletes every message this user sent, across all channels and direct messages (used to purge a guest's messages on logout). */
  async deleteMessagesBySender(userId: string): Promise<void> {
    const [chatsSnapshot, usersSnapshot] = await Promise.all([
      getDocs(collection(firestore, 'chats')),
      getDocs(collection(firestore, 'users')),
    ]);

    // Direct-message "channels" have no chat document of their own - their id is derived
    // from both participants' uids - so every DM pair involving this user is checked too.
    const channelIds = new Set<string>([
      ...chatsSnapshot.docs.map((chatDoc) => chatDoc.id),
      ...usersSnapshot.docs.map((userDoc) => getDirectMessageId(userId, userDoc.id)),
    ]);

    await Promise.all(
      Array.from(channelIds).map(async (channelId) => {
        const messagesRef = collection(firestore, 'chats', channelId, 'messages');
        const ownMessages = await getDocs(query(messagesRef, where('senderId', '==', userId)));
        await Promise.all(ownMessages.docs.map((messageDoc) => deleteDoc(messageDoc.ref)));
      })
    );
  }

  stopListening(): void {
    this.unsubscribeMessages?.();
    this.messages.set([]);
  }

}

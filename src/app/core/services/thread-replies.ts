import { Injectable, signal } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from '../firebase.config';
import { ThreadReply } from '../models/reply.model';

@Injectable({ providedIn: 'root' })
export class ThreadRepliesService {
  private repliesSignal = signal<ThreadReply[]>([]);
  private unsubscribeReplies: Unsubscribe | null = null;

  readonly replies = this.repliesSignal.asReadonly();

  loadReplies(channelId: string, messageId: string): void {
    this.stopListening();

    const repliesRef = collection(
      firestore,
      'chats', channelId, 'messages', messageId, 'replies'
    );
    const repliesQuery = query(repliesRef, orderBy('timestamp', 'asc'));

    this.unsubscribeReplies = onSnapshot(repliesQuery, (snapshot) => {
      const loadedReplies: ThreadReply[] = snapshot.docs.map((replyDoc) => ({
        id: replyDoc.id,
        ...(replyDoc.data() as Omit<ThreadReply, 'id'>),
      }));
      this.repliesSignal.set(loadedReplies);
    });
  }

async sendReply(
  channelId: string,
  messageId: string,
  newReply: Omit<ThreadReply, 'id' | 'timestamp' | 'reactions'>
): Promise<void> {
  const batch = writeBatch(firestore);
  const replyTimestamp = Date.now();

  const replyRef = doc(collection(
    firestore, 'chats', channelId, 'messages', messageId, 'replies'
  ));
  batch.set(replyRef, {
    ...newReply,
    timestamp: replyTimestamp,
    reactions: [],
  });

  const messageRef = doc(firestore, 'chats', channelId, 'messages', messageId);
  batch.update(messageRef, {
    hasThread: true,
    lastReplyTimestamp: replyTimestamp,
  });

  await batch.commit();
}

  stopListening(): void {
    this.unsubscribeReplies?.();
    this.unsubscribeReplies = null;
    this.repliesSignal.set([]);
  }
}
import { Injectable, signal } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  Unsubscribe,
  writeBatch,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { firestore } from '../firebase.config';
import { ThreadReply } from '../models/reply.model';
import { Reaction, ReactionUser } from '../models/message.model';

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

      const threadChanged = snapshot
        .docChanges()
        .some((change) => change.type === 'added' || change.type === 'removed');

      if (threadChanged) {
        void this.syncThreadMetadata(channelId, messageId, loadedReplies);
      }
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

  /** Adds or removes a reaction on a thread reply. */
  async toggleReaction(
    channelId: string,
    messageId: string,
    replyId: string,
    icon: string,
    user: ReactionUser
  ): Promise<void> {
    const replyRef = doc(
      firestore, 'chats', channelId, 'messages', messageId, 'replies', replyId
    );

    await runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(replyRef);
      if (!snapshot.exists()) return;

      const reactions = (snapshot.data()['reactions'] ?? []) as Reaction[];
      transaction.update(replyRef, {
        reactions: this.updateReactions(reactions, icon, user),
      });
    });
  }

  /** Returns the reactions after toggling one user's reaction. */
  private updateReactions(
    reactions: Reaction[],
    icon: string,
    user: ReactionUser
  ): Reaction[] {
    const existing = reactions.find((reaction) => reaction.icon === icon);
    if (!existing) return [...reactions, { icon, reactedBy: [user] }];
    const reacted = existing.reactedBy.some((reactor) => reactor.uid === user.uid);
    const reactedBy = reacted
      ? existing.reactedBy.filter((reactor) => reactor.uid !== user.uid)
      : [...existing.reactedBy, user];

    if (!reactedBy.length) return reactions.filter((reaction) => reaction.icon !== icon);
    return reactions.map((reaction) =>
      reaction.icon === icon ? { ...reaction, reactedBy } : reaction
    );
  }

  /** Updates the text of a thread reply. */
  async updateReply(
    channelId: string,
    messageId: string,
    replyId: string,
    newText: string
  ): Promise<void> {
    const replyRef = doc(
      firestore,
      'chats',
      channelId,
      'messages',
      messageId,
      'replies',
      replyId
    );

    await updateDoc(replyRef, { text: newText });
  }

  /** Deletes a thread reply. */
  async deleteReply(
    channelId: string,
    messageId: string,
    replyId: string
  ): Promise<void> {
    const replyRef = doc(
      firestore, 'chats', channelId, 'messages', messageId, 'replies', replyId
    );
    await deleteDoc(replyRef);
  }

  /** Keeps the parent message thread metadata in sync. */
  private async syncThreadMetadata(
    channelId: string,
    messageId: string,
    replies: ThreadReply[]
  ): Promise<void> {
    const latestReply = replies.at(-1);
    const messageRef = doc(firestore, 'chats', channelId, 'messages', messageId);

    await updateDoc(messageRef, {
      hasThread: replies.length > 0,
      replyCount: replies.length,
      lastReplyTimestamp: latestReply?.timestamp ?? null,
    });
  }

  stopListening(): void {
    this.unsubscribeReplies?.();
    this.unsubscribeReplies = null;
    this.repliesSignal.set([]);
  }
}
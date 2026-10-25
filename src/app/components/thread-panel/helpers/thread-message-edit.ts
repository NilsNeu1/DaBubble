import { signal } from '@angular/core';
import { ChatMessage } from '../../../core/models/message.model';
import { ChatMessagesService } from '../../../core/services/chat-messages';
import { ThreadRepliesService } from '../../../core/services/thread-replies';
import { ThreadMessage } from '../helpers/thread-message-view';

export class ThreadMessageEdit {
    readonly editingId = signal<string | null>(null);
    readonly text = signal('');

    constructor(
        private readonly chatMessages: ChatMessagesService,
        private readonly repliesService: ThreadRepliesService
    ) { }

    /** Checks whether the parent message is being edited. */
    isParent(parentId: string): boolean {
        return this.editingId() === `parent:${parentId}`;
    }

    /** Checks whether the selected reply is being edited. */
    isReply(replyId: string): boolean {
        return this.editingId() === replyId;
    }

    /** Starts editing the parent message. */
    startParent(message: ChatMessage): void {
        this.editingId.set(`parent:${message.id}`);
        this.text.set(message.text);
    }

    /** Starts editing the selected reply. */
    startReply(reply: ThreadMessage): void {
        this.editingId.set(reply.id);
        this.text.set(reply.text);
    }

    /** Cancels editing and clears the edit state. */
    cancel(): void {
        this.editingId.set(null);
        this.text.set('');
    }

    /** Updates the currently edited text. */
    setText(value: string): void {
        this.text.set(value);
    }

    /** Appends an emoji to the edited text. */
    addEmoji(emoji: string): void {
        this.text.update((text) => text + emoji);
    }

    /** Saves the parent message through the existing chat service. */
    async saveParent(channelId: string, message: ChatMessage): Promise<void> {
        const newText = this.text().trim();
        if (!newText || newText === message.text) {
            this.cancel();
            return;
        }
        await this.chatMessages.updateMessage(channelId, message.id, newText);
        this.cancel();
    }

    /** Saves a thread reply through the existing reply service. */
    async saveReply(channelId: string, parentId: string, reply: ThreadMessage): Promise<void> {
        const newText = this.text().trim();
        if (!newText || newText === reply.text) {
            this.cancel();
            return;
        }
        await this.repliesService.updateReply(channelId, parentId, reply.id, newText);
        this.cancel();
    }
}

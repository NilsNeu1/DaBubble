import { signal } from '@angular/core';
import { ChatMessage } from '../../../core/models/message.model';
import { ChatMessagesService } from '../../../core/services/chat-messages';

export class ChatMessageEdit {
    readonly editingId = signal<string | null>(null);
    readonly text = signal<string>('');

    /** Initializes message editing with the existing chat service. */
    constructor(private readonly chatMessages: ChatMessagesService) { }

    /** Checks whether the selected message is being edited. */
    isEditing(messageId: string): boolean {
        return this.editingId() === messageId;
    }

    /** Starts editing a message with its current text. */
    start(message: ChatMessage): void {
        this.editingId.set(message.id);
        this.text.set(message.text);
    }

    /** Cancels editing and clears the current edit state. */
    cancel(): void {
        this.editingId.set(null);
        this.text.set('');
    }

    /** Updates the text of the message being edited. */
    setText(value: string): void {
        this.text.set(value);
    }

    /** Appends an emoji to the current edit text. */
    addEmoji(emoji: string): void {
        this.text.update((currentText) => currentText + emoji);
    }

    /** Saves the changed message through the existing chat service. */
    async save(channelId: string, message: ChatMessage): Promise<void> {
        const newText = this.text().trim();
        if (!newText || newText === message.text) {
            this.cancel();
            return;
        }
        await this.chatMessages.updateMessage(channelId, message.id, newText);
        this.cancel();
    }
}
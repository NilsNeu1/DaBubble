import { signal } from '@angular/core';
import { NewMessageRecipient } from '../../../components/chat-header/chat-header';
import { ChatModel, getDirectMessageId } from '../../../core/chat.model';
import { Auth } from '../../../core/services/auth';
import { MessengerConversationSelection } from './messenger-conversations';

export class MessengerNewMessage {
    readonly recipient = signal<NewMessageRecipient | null>(null);

    /** Provides existing authentication and channel data for composing. */
    constructor(private readonly auth: Auth, private readonly chatModel: ChatModel) { }

    /** Stores the destination selected in the new-message view. */
    setRecipient(recipient: NewMessageRecipient): void {
        this.recipient.set(recipient);
    }

    /** Clears the selected new-message destination. */
    clearRecipient(): void {
        this.recipient.set(null);
    }

    /** Returns the Firestore conversation ID for the current destination. */
    targetId(): string {
        const recipient = this.recipient();
        if (!recipient) return '';
        if (recipient.type === 'channel') return recipient.id;
        const currentUid = this.auth.currentUser()?.uid;
        return currentUid ? getDirectMessageId(currentUid, recipient.id) : '';
    }

    /** Opens the destination after sending a composed message. */
    async openRecipient(select: (event: MessengerConversationSelection) => Promise<void>): Promise<void> {
        const recipient = this.recipient();
        if (!recipient) return;
        if (recipient.type === 'channel') await this.openChannel(recipient.id, select);
        else await select({ channelName: '', conversationType: 'direct-message', channelId: recipient.id });
        this.clearRecipient();
    }

    /** Loads and opens the channel selected in the compose view. */
    private async openChannel(id: string, select: (event: MessengerConversationSelection) => Promise<void>): Promise<void> {
        const channel = this.chatModel.channels().find((item) => item.channelId === id);
        if (!channel) return;
        await this.chatModel.loadChat(id);
        await select({ channelName: channel.channelName, conversationType: 'channel', channelId: id });
    }
}

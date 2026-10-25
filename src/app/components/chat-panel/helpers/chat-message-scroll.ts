import { ChatMessage } from '../../../core/models/message.model';

export class ChatMessageScroll {
    private lastVisibleMessageKey = '';

    /** Initializes scrolling with access to the message container. */
    constructor(
        private readonly getContainer: () => HTMLDivElement | undefined,
        private readonly onHandled: () => void
    ) { }

    /** Handles scrolling to a searched message or the newest message. */
    handle(messages: ChatMessage[], requestedId: string | null, channelId: string): void {
        if (!messages.length) return;
        if (requestedId) {
            requestAnimationFrame(() => this.scrollToRequestedMessage(requestedId, messages, channelId));
            return;
        }
        this.scrollToLatestMessage(messages, channelId);
    }

    /** Scrolls to a newly available latest message. */
    private scrollToLatestMessage(messages: ChatMessage[], channelId: string): void {
        const lastMessage = messages.at(-1);
        if (!lastMessage) return;
        const key = `${channelId}:${lastMessage.id}`;
        if (key === this.lastVisibleMessageKey) return;
        this.lastVisibleMessageKey = key;
        requestAnimationFrame(() => this.scrollToBottom());
    }

    /** Scrolls to the message selected through the header search. */
    private scrollToRequestedMessage(messageId: string, messages: ChatMessage[], channelId: string): void {
        const container = this.getContainer();
        const message = container?.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(messageId)}"]`);
        if (!message) return;
        message.scrollIntoView({ block: 'center' });
        const lastMessage = messages.at(-1);
        this.lastVisibleMessageKey = lastMessage ? `${channelId}:${lastMessage.id}` : '';
        this.onHandled();
    }

    /** Scrolls the chat to the newest message. */
    private scrollToBottom(): void {
        const container = this.getContainer();
        if (!container) return;
        container.scrollTop = container.scrollHeight;
    }
}
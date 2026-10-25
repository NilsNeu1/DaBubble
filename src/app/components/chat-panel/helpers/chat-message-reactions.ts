import { signal } from '@angular/core';
import { ChatMessage, Reaction, ReactionUser } from '../../../core/models/message.model';
import { ChatMessagesService } from '../../../core/services/chat-messages';

export class ChatMessageReactions {
    readonly visibleLimit = signal(window.innerWidth <= 1024 ? 7 : 20);
    readonly expandedMessageIds = signal<ReadonlySet<string>>(new Set());

    constructor(private readonly chatMessages: ChatMessagesService) { }

    /** Updates the visible reaction limit after a viewport resize. */
    updateVisibleLimit(): void {
        const limit = window.innerWidth <= 1024 ? 7 : 20;
        if (this.visibleLimit() === limit) return;
        this.visibleLimit.set(limit);
        this.expandedMessageIds.set(new Set());
    }

    /** Returns the currently visible reactions for a message. */
    visible(message: ChatMessage): Reaction[] {
        if (this.expandedMessageIds().has(message.id)) return message.reactions;
        return message.reactions.slice(0, this.visibleLimit());
    }

    /** Expands or collapses additional reactions for a message. */
    toggleExpanded(messageId: string): void {
        this.expandedMessageIds.update((current) => {
            const next = new Set(current);
            if (next.has(messageId)) next.delete(messageId);
            else next.add(messageId);
            return next;
        });
    }

    /** Checks whether the current user added the reaction. */
    hasReacted(reaction: Reaction, userId: string | undefined): boolean {
        return reaction.reactedBy?.some((user) => user.uid === userId) ?? false;
    }

    /** Returns the names of users who added a reaction. */
    tooltip(reaction: Reaction, userId: string | undefined): string {
        return (reaction.reactedBy ?? [])
            .map((user) => user.uid === userId ? 'Du' : user.name)
            .join(', ');
    }

    /** Updates a message reaction through the existing chat service. */
    async toggle(channelId: string, message: ChatMessage, icon: string, user: ReactionUser): Promise<void> {
        await this.chatMessages.toggleReaction(channelId, message.id, icon, user);
    }
}
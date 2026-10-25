import { Reaction, ReactionUser } from '../../../core/models/message.model';
import { ThreadReply } from '../../../core/models/reply.model';

export interface ThreadReactionUser extends ReactionUser {
    isCurrentUser: boolean;
}

export interface ThreadReaction {
    icon: string;
    reactedBy: ThreadReactionUser[];
}

export interface ThreadMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderImageUrl: string;
    timestamp: string;
    text: string;
    reactions: ThreadReaction[];
    isOwnMessage: boolean;
}

/** Adds the current-user flag to every reaction participant. */
export function mapThreadReactions(reactions: Reaction[], currentUserId: string | undefined): ThreadReaction[] {
    return reactions.map((reaction) => ({
        icon: reaction.icon,
        reactedBy: reaction.reactedBy.map((user) => ({
            ...user,
            isCurrentUser: user.uid === currentUserId
        }))
    }));
}

/** Formats a reply timestamp for display in the thread. */
export function formatThreadTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    }) + ' Uhr';
}

/** Converts a stored thread reply into its display model. */
export function mapThreadReply(reply: ThreadReply, currentUserId: string | undefined): ThreadMessage {
    return {
        id: reply.id,
        senderId: reply.senderId,
        senderName: reply.senderName,
        senderImageUrl: reply.senderImageUrl,
        timestamp: formatThreadTimestamp(reply.timestamp),
        text: reply.text,
        reactions: mapThreadReactions(reply.reactions, currentUserId),
        isOwnMessage: reply.senderId === currentUserId
    };
}

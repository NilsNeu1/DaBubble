import { ChatMessage } from '../../../core/models/message.model';

export type MessengerConversationType = 'channel' | 'direct-message';

export interface MessengerHistoryState {
    dabubbleView: 'new-message' | 'conversation' | 'thread';
    conversationType?: MessengerConversationType;
    channelId?: string;
    channelName?: string;
    threadMessage?: ChatMessage;
}

export class MessengerHistory {
    /** Initializes the workspace history with the new-message view. */
    constructor() {
        history.replaceState({
            ...(history.state ?? {}),
            dabubbleView: 'new-message',
            conversationType: undefined,
            channelId: undefined,
            channelName: undefined,
            threadMessage: undefined
        }, '', location.href);
    }

    /** Adds an internal workspace view unless it is already active. */
    push(state: MessengerHistoryState): void {
        const current = history.state as Partial<MessengerHistoryState> | null;
        if (this.isSameState(current, state)) return;
        history.pushState({ ...(history.state ?? {}), ...state }, '', location.href);
    }

    /** Reads the workspace state from a browser navigation event. */
    fromEvent(event: PopStateEvent): Partial<MessengerHistoryState> | null {
        return event.state as Partial<MessengerHistoryState> | null;
    }

    /** Checks whether two history entries represent the same view. */
    private isSameState(current: Partial<MessengerHistoryState> | null, next: MessengerHistoryState): boolean {
        return current?.dabubbleView === next.dabubbleView &&
            current.conversationType === next.conversationType &&
            current.channelId === next.channelId &&
            current.threadMessage?.id === next.threadMessage?.id;
    }
}

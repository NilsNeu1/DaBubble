import { signal } from '@angular/core';
import { ChatModel, ChannelMember, getDirectMessageId } from '../../../core/chat.model';
import { Auth } from '../../../core/services/auth';
import { OnlineStatus } from '../../../core/models/user.model';
import { MessengerConversationType } from './messenger-history';

export interface MessengerConversationSelection {
    channelName: string;
    conversationType: MessengerConversationType;
    channelId?: string;
}

interface MessengerChannelMember {
    uid: string;
    name: string;
    avatarUrl: string;
    status: OnlineStatus;
}

interface MessengerChannelChat {
    type: 'channel';
    id: string;
    name: string;
    members: MessengerChannelMember[];
    description: string;
    createdBy: string;
}

interface MessengerDirectChat {
    type: 'direct-message';
    id: string;
    partnerId: string;
    name: string;
    avatarUrl: string;
    status: OnlineStatus;
    isCurrentUser: boolean;
}

export type MessengerSelectedChat = MessengerChannelChat | MessengerDirectChat;

export class MessengerConversations {
    readonly selectedChat = signal<MessengerSelectedChat | null>(null);

    /** Provides access to existing authentication and channel data. */
    constructor(private readonly auth: Auth, private readonly chatModel: ChatModel) { }

    /** Loads the selected channel and its members. */
    async selectChannel(event: MessengerConversationSelection): Promise<void> {
        if (!event.channelId) return;
        const channel = await this.chatModel.getChat(event.channelId);
        if (!channel) return;
        this.selectedChat.set({
            type: 'channel', id: event.channelId, name: event.channelName,
            members: this.mapChannelMembers(channel.members ?? []),
            description: channel.description ?? '', createdBy: channel.createdBy ?? ''
        });
    }

    /** Selects the direct conversation belonging to one user. */
    selectDirectMessage(userId?: string): void {
        const user = this.auth.allUsers().find((item) => item.uid === userId);
        if (!user) return;
        const currentUid = this.auth.currentUser()?.uid;
        this.selectedChat.set({
            type: 'direct-message',
            id: currentUid ? getDirectMessageId(currentUid, user.uid) : user.uid,
            partnerId: user.uid, name: user.name, avatarUrl: user.avatarUrl,
            status: user.status, isCurrentUser: user.uid === currentUid
        });
    }

    /** Returns the selected chat with live channel header details. */
    headerChat(): MessengerSelectedChat | null {
        const selected = this.selectedChat();
        const active = this.chatModel.activeChat();
        if (selected?.type !== 'channel' || !active) return selected;
        return {
            ...selected, name: active.channelName, description: active.description,
            members: this.mapChannelMembers(active.members ?? [])
        };
    }

    /** Returns the selected conversation type for workspace highlighting. */
    activeConversationType(): MessengerConversationType | null {
        return this.selectedChat()?.type ?? null;
    }

    /** Returns the member or channel ID used for workspace highlighting. */
    activeConversationId(): string | null {
        const selected = this.selectedChat();
        if (!selected) return null;
        return selected.type === 'direct-message' ? selected.partnerId : selected.id;
    }

    /** Adds the current presence state to channel member data. */
    private mapChannelMembers(members: ChannelMember[]): MessengerChannelMember[] {
        return members.map((member) => ({
            uid: member.uid, name: member.name, avatarUrl: member.avatarUrl,
            status: this.auth.allUsers().find((user) => user.uid === member.uid)?.status ?? 'offline'
        }));
    }
}

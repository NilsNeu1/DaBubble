import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
    collection,
    doc,
    DocumentData,
    DocumentSnapshot,
    onSnapshot,
    QueryDocumentSnapshot,
    QuerySnapshot,
    Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '../../core/firebase.config';
import { AppUser } from '../../core/models/user.model';
import { Auth } from '../../core/services/auth';

/** Defines the supported workspace search result categories. */
export type WorkspaceSearchResultType = 'user' | 'channel' | 'message';

/** Defines one result displayed in the workspace search. */
export interface WorkspaceSearchResult {
    id: string;
    type: WorkspaceSearchResultType;
    label: string;
    avatarUrl?: string;
    status?: 'online' | 'offline';
    contextLabel?: string;
    authorName?: string;
    timestamp?: string;
    channelId?: string;
    messageId?: string;
}

/** Stores normalized message data used by the workspace search. */
interface SearchableMessage {
    id: string;
    channelId: string;
    text: string;
    senderId: string;
    senderName: string;
    senderImageUrl: string;
    timestamp: number;
}

/** Manages live workspace search data and filtering for the header. */
@Injectable()
export class HeaderSearch {
    private readonly authService = inject(Auth);
    private readonly searchableChannels = signal<WorkspaceSearchResult[]>([]);
    private readonly searchableMessages = signal<SearchableMessage[]>([]);

    /** Stores the current workspace search value. */
    readonly searchTerm = signal('');

    /** Returns matching suggestions for the current search value. */
    readonly suggestions = computed(() => this.createSuggestions());

    /** Indicates whether search suggestions are available. */
    readonly hasSuggestions = computed(() => this.suggestions().length > 0);

    /** Indicates whether the mobile search view is active. */
    readonly isMobileActive = computed(() => this.searchTerm().length > 0);

    /** Formats message timestamps shown in search results. */
    private readonly messageDateFormatter = new Intl.DateTimeFormat('de-AT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    /** Starts live search listeners for the current user's channels. */
    constructor() {
        effect((onCleanup) => {
            const unsubscribes = this.createSearchListeners();
            onCleanup(() => this.unsubscribeAll(unsubscribes));
        });
    }

    /** Updates the shared workspace search value. */
    updateTerm(value: string): void {
        this.searchTerm.set(value);
    }

    /** Clears the shared workspace search value. */
    clearTerm(): void {
        this.searchTerm.set('');
    }

    /** Creates listeners for every channel the current user can access. */
    private createSearchListeners(): Unsubscribe[] {
        const channelIds = Object.keys(
            this.authService.currentUser()?.channelMemberships ?? {}
        );
        this.resetSearchCache();
        return channelIds.flatMap((channelId) => [
            this.listenToSearchableChannel(channelId),
            this.listenToSearchableMessages(channelId),
        ]);
    }

    /** Clears cached channel and message search data. */
    private resetSearchCache(): void {
        this.searchableChannels.set([]);
        this.searchableMessages.set([]);
    }

    /** Unsubscribes all active Firestore search listeners. */
    private unsubscribeAll(unsubscribes: Unsubscribe[]): void {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
    }

    /** Listens to one channel that belongs to the current user. */
    private listenToSearchableChannel(channelId: string): Unsubscribe {
        return onSnapshot(
            doc(firestore, 'chats', channelId),
            (snapshot) => this.handleChannelSnapshot(channelId, snapshot)
        );
    }

    /** Handles a live channel snapshot used by the search. */
    private handleChannelSnapshot(
        channelId: string, snapshot: DocumentSnapshot<DocumentData>
    ): void {
        const channelName = this.readChannelName(snapshot);
        if (!channelName) {
            this.removeSearchableChannel(channelId);
            return;
        }
        this.storeSearchableChannel(channelId, channelName);
    }

    /** Reads a valid channel name from a Firestore snapshot. */
    private readChannelName(snapshot: DocumentSnapshot<DocumentData>): string {
        if (!snapshot.exists()) return '';
        const channelName = snapshot.data()['channelName'];
        return typeof channelName === 'string' ? channelName.trim() : '';
    }

    /** Stores or replaces one searchable channel. */
    private storeSearchableChannel(channelId: string, channelName: string): void {
        const channel: WorkspaceSearchResult = {
            id: channelId, type: 'channel', label: channelName,
        };
        this.searchableChannels.update((channels) => [
            ...channels.filter((current) => current.id !== channelId), channel,
        ]);
    }

    /** Removes one unavailable channel from the search cache. */
    private removeSearchableChannel(channelId: string): void {
        this.searchableChannels.update((channels) =>
            channels.filter((channel) => channel.id !== channelId)
        );
    }

    /** Listens to messages from one channel that belongs to the current user. */
    private listenToSearchableMessages(channelId: string): Unsubscribe {
        return onSnapshot(
            collection(firestore, 'chats', channelId, 'messages'),
            (snapshot) => this.handleMessagesSnapshot(channelId, snapshot)
        );
    }

    /** Handles a live message snapshot used by the search. */
    private handleMessagesSnapshot(
        channelId: string, snapshot: QuerySnapshot<DocumentData>
    ): void {
        const messages = snapshot.docs
            .map((messageDoc) => this.toSearchableMessage(channelId, messageDoc))
            .filter((message): message is SearchableMessage => message !== null);
        this.storeSearchableMessages(channelId, messages);
    }

    /** Stores the current searchable messages for one channel. */
    private storeSearchableMessages(
        channelId: string, messages: SearchableMessage[]
    ): void {
        this.searchableMessages.update((currentMessages) => [
            ...currentMessages.filter((message) => message.channelId !== channelId),
            ...messages,
        ]);
    }

    /** Converts one Firestore message into searchable message data. */
    private toSearchableMessage(
        channelId: string, messageDoc: QueryDocumentSnapshot<DocumentData>
    ): SearchableMessage | null {
        const data = messageDoc.data();
        const text = this.readString(data, 'text').trim();
        if (!text) return null;
        return this.createSearchableMessage(messageDoc.id, channelId, text, data);
    }

    /** Creates normalized searchable data for one valid message. */
    private createSearchableMessage(
        id: string, channelId: string, text: string, data: DocumentData
    ): SearchableMessage {
        return {
            id, channelId, text,
            senderId: this.readString(data, 'senderId'),
            senderName: this.readString(data, 'senderName'),
            senderImageUrl: this.readString(data, 'senderImageUrl'),
            timestamp: this.readNumber(data, 'timestamp'),
        };
    }

    /** Reads a string value from Firestore message data. */
    private readString(data: DocumentData, key: string): string {
        const value = data[key];
        return typeof value === 'string' ? value : '';
    }

    /** Reads a number value from Firestore message data. */
    private readNumber(data: DocumentData, key: string): number {
        const value = data[key];
        return typeof value === 'number' ? value : 0;
    }

    /** Creates suggestions for the current search term. */
    private createSuggestions(): WorkspaceSearchResult[] {
        const term = this.searchTerm().trim();
        return term ? this.getSearchSuggestions(term) : [];
    }

    /** Selects the correct search mode for the entered value. */
    private getSearchSuggestions(term: string): WorkspaceSearchResult[] {
        const prefix = term.charAt(0);
        return prefix === '@' || prefix === '#'
            ? this.filterPrefixSuggestions(prefix, term.slice(1))
            : this.filterMessageSuggestions(term);
    }

    /** Filters user or channel suggestions. */
    private filterPrefixSuggestions(
        prefix: string, query: string
    ): WorkspaceSearchResult[] {
        const normalizedQuery = query.trim().toLowerCase();
        return this.getSuggestionsByPrefix(prefix).filter(({ label }) =>
            label.toLowerCase().includes(normalizedQuery)
        );
    }

    /** Selects user or channel suggestions for the entered prefix. */
    private getSuggestionsByPrefix(prefix: string): WorkspaceSearchResult[] {
        return prefix === '@' ? this.getUserSuggestions() : this.searchableChannels();
    }

    /** Creates live user suggestions from the shared Firebase user data. */
    private getUserSuggestions(): WorkspaceSearchResult[] {
        const currentUserId = this.authService.currentUser()?.uid;
        return this.authService.allUsers().map((user) =>
            this.toUserSearchResult(user, currentUserId)
        );
    }

    /** Maps one user to the result format used by the header. */
    private toUserSearchResult(
        user: AppUser, currentUserId?: string
    ): WorkspaceSearchResult {
        return {
            id: user.uid,
            type: 'user',
            label: user.uid === currentUserId ? `${user.name} (Du)` : user.name,
            avatarUrl: user.avatarUrl,
            status: user.status,
        };
    }

    /** Filters messages from channels the current user can access. */
    private filterMessageSuggestions(query: string): WorkspaceSearchResult[] {
        const normalizedQuery = query.trim().toLowerCase();
        return this.searchableMessages()
            .filter((message) => this.matchesMessageSearch(message, normalizedQuery))
            .sort((first, second) => second.timestamp - first.timestamp)
            .map((message) => this.toMessageSearchResult(message));
    }

    /** Checks whether a message matches the search value. */
    private matchesMessageSearch(message: SearchableMessage, query: string): boolean {
        const searchableText = [
            message.text,
            this.getSenderName(message),
            this.getChannelLabel(message.channelId),
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
    }

    /** Maps a stored message to the result format used by the header. */
    private toMessageSearchResult(message: SearchableMessage): WorkspaceSearchResult {
        return {
            id: `${message.channelId}:${message.id}`,
            type: 'message',
            label: message.text,
            contextLabel: this.getMessageContextLabel(message.channelId),
            authorName: this.getSenderName(message),
            timestamp: this.formatMessageTimestamp(message.timestamp),
            avatarUrl: this.getSenderAvatar(message),
            channelId: message.channelId,
            messageId: message.id,
        };
    }

    /** Returns the current name for a message sender. */
    private getSenderName(message: SearchableMessage): string {
        return this.findUser(message.senderId)?.name ?? message.senderName;
    }

    /** Returns the current avatar for a message sender. */
    private getSenderAvatar(message: SearchableMessage): string {
        return this.findUser(message.senderId)?.avatarUrl ?? message.senderImageUrl;
    }

    /** Finds one user in the live shared user data. */
    private findUser(userId: string): AppUser | undefined {
        return this.authService.allUsers().find((user) => user.uid === userId);
    }

    /** Returns the current label for one searchable channel. */
    private getChannelLabel(channelId: string): string {
        return this.searchableChannels().find(
            (channel) => channel.id === channelId
        )?.label ?? '';
    }

    /** Returns the displayed channel context for one message result. */
    private getMessageContextLabel(channelId: string): string {
        const channelLabel = this.getChannelLabel(channelId);
        return channelLabel ? `# ${channelLabel}` : '';
    }

    /** Formats a stored message timestamp for the search result. */
    private formatMessageTimestamp(timestamp: number): string {
        if (!timestamp) return '';
        return `${this.messageDateFormatter.format(new Date(timestamp))} Uhr`;
    }
}
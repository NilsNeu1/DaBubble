import { computed, signal } from '@angular/core';
import { ChatModel } from '../../../core/chat.model';
import { AppUser, OnlineStatus } from '../../../core/models/user.model';
import { Auth } from '../../../core/services/auth';

export interface NewMessageSearchSuggestion {
    id: string;
    type: 'user' | 'channel';
    label: string;
    email?: string;
    avatarUrl?: string;
    status?: OnlineStatus;
}

export interface NewMessageRecipient {
    id: string;
    type: 'user' | 'channel';
}

export class ChatHeaderNewMessage {
    readonly searchTerm = signal('');
    readonly selectedIndex = signal(0);
    readonly isFocused = signal(false);
    readonly selectedSuggestion = signal<NewMessageSearchSuggestion | null>(null);
    readonly suggestions = computed(() => {
        if (this.selectedSuggestion()) return [];
        const term = this.searchTerm().trim();
        return term ? this.getSuggestions(term) : [];
    });
    readonly isSuggestionListOpen = computed(() => this.isFocused() && this.suggestions().length > 0);

    /** Initializes recipient search with existing user and channel data. */
    constructor(
        private readonly auth: Auth,
        private readonly chatModel: ChatModel,
        private readonly getResults: () => HTMLDivElement | undefined
    ) { }

    /** Returns the placeholder for the current viewport width. */
    getPlaceholder(): string {
        return window.innerWidth <= 1024
            ? 'An: #channel, oder @jemand'
            : 'An: #channel, oder @jemand oder E-Mail Adresse';
    }

    /** Updates the recipient search after input changes. */
    updateSearch(value: string): void {
        this.selectedSuggestion.set(null);
        this.searchTerm.set(value);
        this.selectedIndex.set(0);
    }

    /** Handles keyboard navigation for recipient suggestions. */
    handleKeydown(event: KeyboardEvent, onSelect: (item: NewMessageSearchSuggestion) => void): void {
        if (event.isComposing || !this.isSuggestionListOpen()) return;
        if (event.key === 'ArrowDown') return this.moveSelection(event, 1);
        if (event.key === 'ArrowUp') return this.moveSelection(event, -1);
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const item = this.suggestions()[this.selectedIndex()];
        if (item) onSelect(item);
    }

    /** Moves the highlighted suggestion and keeps it visible. */
    private moveSelection(event: KeyboardEvent, direction: number): void {
        event.preventDefault();
        const count = this.suggestions().length;
        this.selectedIndex.update((index) => (index + direction + count) % count);
        this.scrollSelectedResult();
    }

    /** Scrolls the selected suggestion into the visible results area. */
    private scrollSelectedResult(): void {
        this.getResults()?.querySelectorAll('.chat-header__new-message-result')
        [this.selectedIndex()]?.scrollIntoView({ block: 'nearest' });
    }

    /** Stores a recipient and returns the payload for the parent view. */
    selectRecipient(item: NewMessageSearchSuggestion): NewMessageRecipient {
        this.selectedSuggestion.set(item);
        this.searchTerm.set('');
        return { id: item.id, type: item.type };
    }

    /** Clears the selected recipient and search term. */
    clearRecipient(): void {
        this.selectedSuggestion.set(null);
        this.searchTerm.set('');
    }

    /** Resets the compose state when the new-message view closes. */
    reset(): void {
        this.searchTerm.set('');
        this.selectedSuggestion.set(null);
    }

    /** Chooses user or channel suggestions based on the search prefix. */
    private getSuggestions(term: string): NewMessageSearchSuggestion[] {
        const prefix = term.charAt(0);
        if (prefix === '#') return this.filterChannels(term.slice(1));
        if (prefix === '@') return this.filterUsers(term.slice(1));
        return this.filterUsers(term);
    }

    /** Filters users by name or email address. */
    private filterUsers(query: string): NewMessageSearchSuggestion[] {
        const normalized = query.trim().toLowerCase();
        return this.auth.allUsers()
            .filter((user) => this.matchesUser(user, normalized))
            .map((user) => this.mapUser(user));
    }

    /** Checks whether a user matches the recipient query. */
    private matchesUser(user: AppUser, query: string): boolean {
        return `${user.name} ${user.email}`.toLowerCase().includes(query);
    }

    /** Converts a user into a recipient suggestion. */
    private mapUser(user: AppUser): NewMessageSearchSuggestion {
        return {
            id: user.uid, type: 'user', label: user.name,
            email: user.email, avatarUrl: user.avatarUrl, status: user.status
        };
    }

    /** Filters the available channels by their names. */
    private filterChannels(query: string): NewMessageSearchSuggestion[] {
        const normalized = query.trim().toLowerCase();
        return this.chatModel.channels()
            .filter(({ channelName }) => channelName.toLowerCase().includes(normalized))
            .map(({ channelId, channelName }) => ({ id: channelId, type: 'channel' as const, label: channelName }));
    }
}

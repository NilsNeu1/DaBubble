import { computed, signal } from '@angular/core';
import {
    filterMentionChannels, filterMentionPeople, getMentionSearch,
    getTextBeforeCursor, MentionChannel, MentionItem, MentionPerson,
    MentionSearch
} from '../mention';

export class ChatMessageMentions {
    readonly search = signal<MentionSearch | null>(null);
    readonly selectedIndex = signal(0);
    readonly items = computed<MentionItem[]>(() => {
        const search = this.search();
        if (!search) return [];
        return search.trigger === '@'
            ? filterMentionPeople(this.getPeople(), search.query)
            : filterMentionChannels(this.getChannels(), search.query);
    });

    constructor(
        private readonly getEditor: () => HTMLElement,
        private readonly getPeople: () => MentionPerson[],
        private readonly getChannels: () => MentionChannel[]
    ) { }

    /** Updates mention suggestions from the current cursor position. */
    updateSearch(): boolean {
        const search = getMentionSearch(getTextBeforeCursor(this.getEditor()));
        this.search.set(search);
        this.selectedIndex.set(0);
        return !!search;
    }

    /** Handles keyboard navigation and selection of typed mentions. */
    handleKeydown(event: KeyboardEvent, select: (item: MentionItem) => void, send: () => void): void {
        if (event.key === 'Enter' && event.shiftKey) return;
        if (event.key === 'Escape') return this.close();
        if (!this.search() || this.items().length === 0) {
            if (event.key === 'Enter') send();
            return;
        }
        if (event.key === 'ArrowDown') this.moveSelection(event, 1);
        if (event.key === 'ArrowUp') this.moveSelection(event, -1);
        if (event.key === 'Enter') this.confirmSelection(event, select);
    }

    /** Moves the selected mention suggestion. */
    private moveSelection(event: KeyboardEvent, direction: number): void {
        event.preventDefault();
        const count = this.items().length;
        this.selectedIndex.update((index) => (index + direction + count) % count);
    }

    /** Confirms the selected mention suggestion. */
    private confirmSelection(event: KeyboardEvent, select: (item: MentionItem) => void): void {
        event.preventDefault();
        const item = this.items()[this.selectedIndex()];
        if (item) select(item);
    }

    /** Closes the typed mention suggestions and resets their selection. */
    close(): void {
        this.search.set(null);
        this.selectedIndex.set(0);
    }
}
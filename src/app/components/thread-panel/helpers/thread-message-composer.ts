import { computed, Renderer2, signal } from '@angular/core';
import {
    filterMentionChannels, filterMentionPeople, getMentionReplacementRange,
    getMentionSearch, getTextBeforeCursor, MentionChannel, MentionItem,
    MentionPerson, MentionSearch
} from '../../chat-panel/mention';

export class ThreadMessageComposer {
    readonly typedMentionSearch = signal<MentionSearch | null>(null);
    readonly typedMentionIndex = signal(0);
    readonly typedMentionItems = computed<MentionItem[]>(() => {
        const search = this.typedMentionSearch();
        if (!search) return [];
        return search.trigger === '@'
            ? filterMentionPeople(this.getPeople(), search.query)
            : filterMentionChannels(this.getChannels(), search.query);
    });
    private mentionButtonRange: Range | null = null;
    private emojiButtonRange: Range | null = null;

    /** Initializes the composer with its editor and mention sources. */
    constructor(
        private readonly renderer: Renderer2,
        private readonly getEditor: () => HTMLDivElement | undefined,
        private readonly getPeople: () => MentionPerson[],
        private readonly getChannels: () => MentionChannel[]
    ) { }

    /** Removes empty editor markup and refreshes mention suggestions. */
    handleEditorInput(event: Event): void {
        const editor = event.currentTarget as HTMLElement;
        if (!editor.textContent?.trim()) editor.innerHTML = '';
        this.updateTypedMentionSearch();
    }

    /** Updates mention suggestions from the current reply cursor position. */
    updateTypedMentionSearch(): void {
        const editor = this.getEditor();
        if (!editor) return;
        const search = getMentionSearch(getTextBeforeCursor(editor));
        this.typedMentionSearch.set(search);
        this.typedMentionIndex.set(0);
    }

    /** Closes the typed mention suggestions. */
    closeTypedMentionSearch(): void {
        this.typedMentionSearch.set(null);
        this.typedMentionIndex.set(0);
    }

    /** Replaces the typed mention query with the selected mention. */
    insertTypedMention(item: MentionItem): void {
        const editor = this.getEditor();
        const search = this.typedMentionSearch();
        const selection = document.getSelection();
        if (!editor || !search || !selection?.rangeCount) return;
        const range = getMentionReplacementRange(editor, selection.getRangeAt(0), search);
        if (range) this.insertMentionAtRange(range, item);
    }

    /** Handles sending, line breaks and keyboard navigation for replies. */
    handleKeydown(event: KeyboardEvent, send: () => void): void {
        if (event.key === 'Enter' && event.shiftKey) return;
        if (event.key === 'Escape') {
            this.typedMentionSearch.set(null);
            return;
        }
        if (this.typedMentionSearch() && this.typedMentionItems().length) {
            this.handleMentionKeydown(event);
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            send();
        }
    }

    /** Handles the arrow and enter keys while mention suggestions are open. */
    private handleMentionKeydown(event: KeyboardEvent): void {
        if (event.key === 'ArrowDown') this.moveMentionSelection(event, 1);
        if (event.key === 'ArrowUp') this.moveMentionSelection(event, -1);
        if (event.key === 'Enter') this.confirmMentionSelection(event);
    }

    /** Moves the selected mention suggestion in the given direction. */
    private moveMentionSelection(event: KeyboardEvent, direction: number): void {
        event.preventDefault();
        const count = this.typedMentionItems().length;
        this.typedMentionIndex.update((index) => (index + direction + count) % count);
    }

    /** Inserts the currently selected mention suggestion. */
    private confirmMentionSelection(event: KeyboardEvent): void {
        event.preventDefault();
        const item = this.typedMentionItems()[this.typedMentionIndex()];
        if (item) this.insertTypedMention(item);
    }

    /** Creates a non-editable mention pill. */
    private createMentionPill(item: MentionItem): HTMLSpanElement {
        const pill = this.renderer.createElement('span') as HTMLSpanElement;
        const prefix = item.type === 'channel' ? '#' : '@';
        this.renderer.addClass(pill, 'mention-pill');
        this.renderer.setAttribute(pill, 'contenteditable', 'false');
        this.renderer.setAttribute(pill, 'data-type', item.type);
        this.renderer.setAttribute(pill, 'data-name', item.name);
        this.renderer.appendChild(pill, this.renderer.createText(`${prefix}${item.name}`));
        return pill;
    }

    /** Inserts a mention pill and its following space. */
    private insertMentionAtRange(range: Range, item: MentionItem): void {
        range.deleteContents();
        const pill = this.createMentionPill(item);
        range.insertNode(pill);
        const space = this.renderer.createText('\u00A0');
        range.setStartAfter(pill);
        range.collapse(true);
        range.insertNode(space);
        range.setStartAfter(space);
        range.collapse(true);
        this.restoreMentionSelection(range);
    }

    /** Restores the reply cursor and closes mention suggestions. */
    private restoreMentionSelection(range: Range): void {
        const selection = document.getSelection();
        if (!selection) return;
        this.getEditor()?.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        this.closeTypedMentionSearch();
    }

    /** Saves the reply cursor before the mention button takes focus. */
    saveMentionButtonCursor(): void {
        this.mentionButtonRange = this.getCurrentCursor() ?? this.mentionButtonRange;
    }

    /** Saves the reply cursor before the emoji button takes focus. */
    saveEmojiButtonCursor(): void {
        this.emojiButtonRange = this.getCurrentCursor() ?? this.emojiButtonRange;
    }

    /** Returns the current cursor when it belongs to the reply editor. */
    private getCurrentCursor(): Range | null {
        const editor = this.getEditor();
        const selection = document.getSelection();
        if (!editor || !selection?.rangeCount) return null;
        const range = selection.getRangeAt(0);
        return editor.contains(range.endContainer) ? range.cloneRange() : null;
    }

    /** Inserts an emoji at the saved reply cursor position. */
    insertReplyEmoji(emoji: string): void {
        const editor = this.getEditor();
        if (!editor) return;
        const range = this.emojiButtonRange?.cloneRange() ?? document.createRange();
        if (!this.emojiButtonRange) {
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        range.deleteContents();
        const textNode = this.renderer.createText(emoji);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        this.restoreEmojiSelection(editor, range);
    }

    /** Restores the cursor after inserting an emoji. */
    private restoreEmojiSelection(editor: HTMLDivElement, range: Range): void {
        const selection = document.getSelection();
        editor.focus();
        selection?.removeAllRanges();
        selection?.addRange(range);
        this.emojiButtonRange = range.cloneRange();
    }

    /** Inserts a mention from the button picker at the saved cursor. */
    insertPickerMention(item: MentionItem): void {
        const editor = this.getEditor();
        if (!editor) return;
        const range = this.mentionButtonRange?.cloneRange() ?? document.createRange();
        if (!this.mentionButtonRange) {
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        this.insertMentionAtRange(range, item);
        this.mentionButtonRange = null;
    }

    /** Returns the current reply text without surrounding whitespace. */
    getReplyText(): string {
        return this.getEditor()?.textContent?.trim() ?? '';
    }

    /** Clears the reply editor after successfully sending. */
    clearReply(): void {
        const editor = this.getEditor();
        if (editor) editor.innerHTML = '';
    }
}

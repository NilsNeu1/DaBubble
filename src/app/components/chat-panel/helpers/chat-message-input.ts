import { Renderer2, signal } from '@angular/core';
import { getMentionReplacementRange, MentionItem, MentionSearch } from '../mention';

export class ChatMessageInput {
    readonly isEmpty = signal(true);
    private savedRange: Range | null = null;

    /** Initializes the message editor with its renderer and element. */
    constructor(
        private readonly renderer: Renderer2,
        private readonly getEditor: () => HTMLElement
    ) { }

    /** Saves the cursor position inside the message editor. */
    saveCursorPosition(): void {
        const selection = document.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (this.getEditor().contains(range.commonAncestorContainer)) {
            this.savedRange = range.cloneRange();
        }
    }

    /** Restores the saved cursor position or moves it to the end. */
    private restoreCursorPosition(): Range {
        const editor = this.getEditor();
        editor.focus();
        const selection = document.getSelection();
        if (!selection) throw new Error('Selection API not available');
        const range = this.savedRange ?? this.createEndCursorRange(editor);
        selection.removeAllRanges();
        selection.addRange(range);
        return range;
    }

    /** Creates a cursor range at the end of the editor. */
    private createEndCursorRange(editor: HTMLElement): Range {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        return range;
    }

    /** Inserts an emoji at the current cursor position. */
    insertEmoji(emoji: string): void {
        const range = this.restoreCursorPosition();
        range.deleteContents();
        const textNode = this.renderer.createText(emoji);
        range.insertNode(textNode);
        this.moveCursorAfterNode(range, textNode);
        this.updateEmptyState();
    }

    /** Inserts a mention pill at the current cursor position. */
    insertMention(item: MentionItem): void {
        const range = this.restoreCursorPosition();
        range.deleteContents();
        const pill = this.createMentionPill(item);
        range.insertNode(pill);
        this.placeCursorAfterMention(range, pill);
        this.updateEmptyState();
    }

    /** Creates a non-editable mention pill. */
    private createMentionPill(item: MentionItem): HTMLSpanElement {
        const pill = this.renderer.createElement('span') as HTMLSpanElement;
        this.renderer.addClass(pill, 'mention-pill');
        this.renderer.setAttribute(pill, 'contenteditable', 'false');
        this.renderer.setAttribute(pill, 'data-type', item.type);
        this.renderer.setAttribute(pill, 'data-name', item.name);
        const prefix = item.type === 'channel' ? '#' : '@';
        this.renderer.appendChild(pill, this.renderer.createText(`${prefix}${item.name}`));
        return pill;
    }

    /** Adds spacing after an inserted mention. */
    private placeCursorAfterMention(range: Range, pill: HTMLSpanElement): void {
        const spaceNode = this.renderer.createText('\u00A0');
        range.setStartAfter(pill);
        range.collapse(true);
        range.insertNode(spaceNode);
        this.moveCursorAfterNode(range, spaceNode);
    }

    /** Moves the cursor behind a node and saves its position. */
    private moveCursorAfterNode(range: Range, node: Node): void {
        range.setStartAfter(node);
        range.setEndAfter(node);
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        this.savedRange = range.cloneRange();
    }

    /** Prepares the replacement range for a typed mention. */
    prepareTypedMention(search: MentionSearch): boolean {
        if (!this.savedRange) return false;
        const range = getMentionReplacementRange(
            this.getEditor(),
            this.savedRange,
            search
        );
        if (!range) return false;
        this.savedRange = range;
        return true;
    }

    /** Updates whether the message input is empty. */
    updateEmptyState(): void {
        const editor = this.getEditor();
        this.isEmpty.set(
            editor.textContent?.trim().length === 0 &&
            editor.querySelectorAll('.mention-pill').length === 0
        );
    }

    /** Returns the plain text of the current message. */
    getPlainTextValue(): string {
        const editor = this.getEditor();
        let result = '';
        editor.childNodes.forEach((node) => {
            result += node.textContent ?? '';
        });
        return result.trim();
    }

    /** Clears the editor after switching conversations. */
    clearForConversationChange(): void {
        this.getEditor().innerHTML = '';
        this.isEmpty.set(true);
    }
}
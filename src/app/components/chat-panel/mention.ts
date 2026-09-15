import { AppUser } from '../../core/models/user.model';

export interface MentionPerson {
    type: 'person';
    uid: string;
    name: string;
    imageUrl: string;
    status: AppUser['status'];
}

export interface MentionChannel {
    type: 'channel';
    channelId: string;
    name: string;
    imageUrl: string;
}

export type MentionItem = MentionPerson | MentionChannel;

export type MentionTrigger = '@' | '#';

export interface MentionSearch {
    trigger: MentionTrigger;
    query: string;
}

/** Maps users to items displayed in the mention picker. */
export function createMentionPeople(users: readonly AppUser[]): MentionPerson[] {
    return users.map((user) => ({
        type: 'person',
        uid: user.uid,
        name: user.name,
        imageUrl: user.avatarUrl,
        status: user.status,
    }));
}

/** Maps channels to items displayed in the mention picker. */
export function createMentionChannels(
    channels: ReadonlyArray<{ channelId: string; channelName: string }>
): MentionChannel[] {
    return channels.map((channel) => ({
        type: 'channel',
        channelId: channel.channelId,
        name: channel.channelName,
        imageUrl: '/assets/Workspace_logo.png',
    }));
}

/** Finds the active mention query at the current cursor position. */
export function getMentionSearch(textBeforeCursor: string): MentionSearch | null {
    const match = textBeforeCursor.match(/(?:^|\s)([@#])([^\s@#]*)$/);
    if (!match) return null;
    return {
        trigger: match[1] as MentionTrigger,
        query: match[2],
    };
}

/** Filters people by the current mention query. */
export function filterMentionPeople(
    people: readonly MentionPerson[],
    query: string
): MentionPerson[] {
    const normalizedQuery = query.trim().toLowerCase();
    return people.filter((person) =>
        person.name.toLowerCase().includes(normalizedQuery)
    );
}

/** Filters channels by the current mention query. */
export function filterMentionChannels(
    channels: readonly MentionChannel[],
    query: string
): MentionChannel[] {
    const normalizedQuery = query.trim().toLowerCase();
    return channels.filter((channel) =>
        channel.name.toLowerCase().includes(normalizedQuery)
    );
}

/** Returns the text from the editor start to the current cursor position. */
export function getTextBeforeCursor(editor: HTMLElement): string {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return '';
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.endContainer)) return '';
    const textRange = range.cloneRange();
    textRange.selectNodeContents(editor);
    textRange.setEnd(range.endContainer, range.endOffset);
    return textRange.toString();
}

/** Creates a range covering the active mention text before the cursor. */
export function getMentionReplacementRange(
    editor: HTMLElement,
    cursorRange: Range,
    search: MentionSearch
): Range | null {
    if (!editor.contains(cursorRange.endContainer)) return null;
    const mentionLength = search.query.length + 1;
    return createReplacementRange(editor, cursorRange, mentionLength);
}

/** Creates the replacement range from the current cursor position. */
function createReplacementRange(
    editor: HTMLElement,
    cursorRange: Range,
    mentionLength: number
): Range | null {
    const range = cursorRange.cloneRange();
    const node = range.endContainer;
    return findMentionStart(editor, range, node, range.endOffset, mentionLength);
}

/** Finds the start of the active mention text. */
function findMentionStart(
    editor: HTMLElement,
    range: Range,
    node: Node,
    offset: number,
    remaining: number
): Range | null {
    const textLength = getAvailableTextLength(node, range.endContainer, offset);
    if (textLength >= remaining) {
        range.setStart(node, textLength - remaining);
        return range;
    }
    return continueMentionSearch(editor, range, node, remaining - textLength);
}

/** Continues searching for the mention start in previous text nodes. */
function continueMentionSearch(
    editor: HTMLElement,
    range: Range,
    node: Node,
    remaining: number
): Range | null {
    const previousNode = getPreviousTextNode(editor, node);
    if (!previousNode) return null;
    const offset = previousNode.textContent?.length ?? 0;
    return findMentionStart(editor, range, previousNode, offset, remaining);
}

/** Returns the usable text length of the current node. */
function getAvailableTextLength(
    node: Node,
    endNode: Node,
    offset: number
): number {
    if (node.nodeType !== Node.TEXT_NODE) return 0;
    return node === endNode ? offset : node.textContent?.length ?? 0;
}

/** Returns the previous text node inside the editor. */
function getPreviousTextNode(
    editor: HTMLElement,
    node: Node
): Node | null {
    const previousNode = getPreviousNode(editor, node);
    return previousNode ? getLastTextNode(previousNode) : null;
}

/** Returns the previous node inside the editor. */
function getPreviousNode(editor: HTMLElement, node: Node): Node | null {
    if (node.previousSibling) return node.previousSibling;
    if (!node.parentNode || node.parentNode === editor) return null;
    return getPreviousNode(editor, node.parentNode);
}

/** Returns the last text node contained in a node. */
function getLastTextNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) return node;
    if (!node.lastChild) return null;
    return getLastTextNode(node.lastChild);
}
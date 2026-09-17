import {
    AfterViewInit,
    Component,
    computed,
    ElementRef,
    Input,
    output,
    signal,
    Renderer2,
    ViewChild,
    HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreadHeader } from '../thread-header/thread-header';
import { ChatMessage, Reaction, ReactionUser } from '../../core/models/message.model';
import { ThreadRepliesService } from '../../core/services/thread-replies';
import { ThreadReply } from '../../core/models/reply.model';
import { Auth } from '../../core/services/auth';
import { OnInit, OnDestroy } from '@angular/core';
import { inject } from '@angular/core';
import { ChatModel } from '../../core/chat.model';
import {
    createMentionChannels,
    createMentionPeople,
    filterMentionChannels,
    filterMentionPeople,
    MentionItem,
    MentionSearch,
    getMentionSearch,
    getTextBeforeCursor,
    getMentionReplacementRange,
} from '../chat-panel/mention';


// interface ThreadReactionUser {
//     id: string;
//     name: string;
//     isCurrentUser?: boolean;
// }

interface ThreadReaction {
    icon: string;
    reactedBy: ThreadReactionUser[];
}
interface ThreadReactionUser extends ReactionUser {
    isCurrentUser: boolean;
}


interface ThreadMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderImageUrl: string;
    timestamp: string;
    text: string;
    reactions: ThreadReaction[];
    isOwnMessage: boolean;
}

@Component({
    selector: 'app-thread-panel',
    imports: [CommonModule, ThreadHeader],
    templateUrl: './thread-panel.html',
    styleUrl: './thread-panel.scss',
})
export class ThreadPanel implements AfterViewInit, OnInit, OnDestroy {

    @ViewChild('threadMessages')
    private threadMessages?: ElementRef<HTMLDivElement>;

    @ViewChild('replyEditor')
    private replyEditor?: ElementRef<HTMLDivElement>;

    public readonly closeRequested = output<void>();

    public readonly userProfileRequested = output<string>();

    protected readonly openEditMenuId = signal<string | null>(null);
    protected readonly showMentionPicker = signal(false);
    @ViewChild('threadMentionWrapper')
    private mentionWrapper?: ElementRef<HTMLDivElement>;

    protected get mentionPeople() {
        return createMentionPeople(this.authService.allUsers());
    }

    protected get mentionChannels() {
        return createMentionChannels(this.chatModel.channels());
    }

    private mentionButtonRange: Range | null = null;

    private editMenuCloseTimeout?: ReturnType<typeof setTimeout>;

    @Input({ required: true }) parentMessage!: ChatMessage;
    @Input({ required: true }) channelId!: string;

    private readonly repliesService = inject(ThreadRepliesService);
    private readonly authService = inject(Auth);
    private readonly chatModel = inject(ChatModel);
    private readonly renderer = inject(Renderer2);

    protected readonly typedMentionSearch = signal<MentionSearch | null>(null);
    protected readonly typedMentionIndex = signal(0);

    protected readonly typedMentionItems = computed<MentionItem[]>(() => {
        const search = this.typedMentionSearch();
        if (!search) return [];
        return search.trigger === '@'
            ? filterMentionPeople(createMentionPeople(this.authService.allUsers()), search.query)
            : filterMentionChannels(createMentionChannels(this.chatModel.channels()), search.query);
    });


    /** Enriches raw reactions with per-user "isCurrentUser" flags for the template. */
    private mapReactions(reactions: Reaction[], currentUserId: string | undefined): ThreadReaction[] {
        return reactions.map((reaction) => ({
            icon: reaction.icon,
            reactedBy: reaction.reactedBy.map((user) => ({
                ...user,
                isCurrentUser: user.uid === currentUserId,
            })),
        }));
    }

    /** Formats a Unix-Timestamp (ms) as a localized time string. */
    private formatTimestamp(timestamp: number): string {
        return new Date(timestamp).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
        }) + ' Uhr';
    }

    // Swapped for implementation of the replies getter below, which enriches the raw replies with additional data for the template.
    protected get replies(): ThreadMessage[] {
        const currentUserId = this.authService.currentUser()?.uid;

        return this.repliesService.replies().map((reply) => ({
            id: reply.id,
            senderId: reply.senderId,
            senderName: reply.senderName,
            senderImageUrl: reply.senderImageUrl,
            timestamp: this.formatTimestamp(reply.timestamp),
            text: reply.text,
            reactions: this.mapReactions(reply.reactions, currentUserId),
            isOwnMessage: reply.senderId === currentUserId,
        }));
    }

    /** Removes empty contenteditable markup so the placeholder becomes visible again. */
    protected handleEditorInput(event: Event): void {
        const editor = event.currentTarget as HTMLElement;
        if (!editor.textContent?.trim()) {
            editor.innerHTML = '';
        }
        this.updateTypedMentionSearch();
    }

    /** Updates mention suggestions from the current reply cursor position. */
    protected updateTypedMentionSearch(): void {
        const editor = this.replyEditor?.nativeElement;
        if (!editor) return;
        const textBeforeCursor = getTextBeforeCursor(editor);
        const search = getMentionSearch(textBeforeCursor);
        this.typedMentionSearch.set(search);
        this.typedMentionIndex.set(0);
    }

    /** Closes the typed mention suggestions. */
    protected closeTypedMentionSearch(): void {
        this.typedMentionSearch.set(null);
        this.typedMentionIndex.set(0);
    }

    /** Replaces the typed mention query with the selected mention. */
    protected insertTypedMention(item: MentionItem): void {
        const editor = this.replyEditor?.nativeElement;
        const search = this.typedMentionSearch();
        const selection = document.getSelection();
        if (!editor || !search || !selection?.rangeCount) return;
        const range = getMentionReplacementRange(editor, selection.getRangeAt(0), search);
        if (!range) return;
        this.insertMentionAtRange(range, item);
    }

    /** Handles keyboard navigation for typed thread mentions. */
    protected onReplyEditorKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && event.shiftKey) return;
        if (event.key === 'Escape') {
            this.typedMentionSearch.set(null);
            return;
        }
        if (!this.typedMentionSearch() || !this.typedMentionItems().length) return;
        if (event.key === 'ArrowDown') this.moveMentionSelection(event, 1);
        if (event.key === 'ArrowUp') this.moveMentionSelection(event, -1);
        if (event.key === 'Enter') this.confirmMentionSelection(event);
    }

    /** Moves the selected mention suggestion in the given direction. */
    private moveMentionSelection(event: KeyboardEvent, direction: number): void {
        event.preventDefault();
        const count = this.typedMentionItems().length;
        this.typedMentionIndex.update(
            (index) => (index + direction + count) % count
        );
    }

    /** Inserts the currently selected mention suggestion. */
    private confirmMentionSelection(event: KeyboardEvent): void {
        event.preventDefault();
        const item = this.typedMentionItems()[this.typedMentionIndex()];
        if (item) this.insertTypedMention(item);
    }

    /** Creates a mention pill matching the regular chat input. */
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

    /** Inserts the mention pill and a space at the replacement range. */
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

    /** Restores the editor cursor and closes the mention suggestions. */
    private restoreMentionSelection(range: Range): void {
        const selection = document.getSelection();
        if (!selection) return;
        this.replyEditor?.nativeElement.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        this.typedMentionSearch.set(null);
        this.typedMentionIndex.set(0);
    }

    /** Saves the reply cursor before the mention button receives focus. */
    protected saveMentionButtonCursor(): void {
        const editor = this.replyEditor?.nativeElement;
        const selection = document.getSelection();
        if (!editor || !selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (editor.contains(range.endContainer)) {
            this.mentionButtonRange = range.cloneRange();
        }
    }

    /** Toggles the mention picker for the thread reply editor. */
    protected toggleMentionPicker(): void {
        this.showMentionPicker.update(open => !open);
        this.typedMentionSearch.set(null);
        this.typedMentionIndex.set(0);
    }

    /** Closes the mention picker when clicking outside its wrapper. */
    @HostListener('document:click', ['$event'])
    protected onMentionOutsideClick(event: MouseEvent): void {
        if (!this.showMentionPicker()) return;
        const wrapper = this.mentionWrapper?.nativeElement;
        if (wrapper?.contains(event.target as Node)) return;
        this.showMentionPicker.set(false);
    }

    /** Inserts a mention selected from the thread mention picker. */
    protected insertPickerMention(item: MentionItem): void {
        const editor = this.replyEditor?.nativeElement;
        if (!editor) return;
        const range = this.mentionButtonRange?.cloneRange() ?? document.createRange();
        if (!this.mentionButtonRange) {
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        this.insertMentionAtRange(range, item);
        this.mentionButtonRange = null;
        this.showMentionPicker.set(false);
    }

    /** Scrolls to the newest thread message after the thread view is rendered. */
    public ngAfterViewInit(): void {
        requestAnimationFrame(() => this.scrollToBottom());
    }

    /** Scrolls the thread message area to its bottom position. */
    private scrollToBottom(): void {
        const messageContainer = this.threadMessages?.nativeElement;

        if (!messageContainer) {
            return;
        }

        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    /** Toggles the edit menu of an own thread message. */
    protected toggleEditMenu(messageId: string): void {
        this.openEditMenuId.update((currentId) =>
            currentId === messageId ? null : messageId
        );
    }

    /** Schedules closing the edit menu after the cursor leaves its area. */
    protected scheduleEditMenuClose(): void {
        this.editMenuCloseTimeout = setTimeout(() => {
            this.openEditMenuId.set(null);
        }, 150);
    }

    /** Keeps the edit menu open while the cursor is inside it. */
    protected cancelEditMenuClose(): void {
        if (this.editMenuCloseTimeout) {
            clearTimeout(this.editMenuCloseTimeout);
            this.editMenuCloseTimeout = undefined;
        }
    }

    /** Closes the edit menu of an own thread message. */
    protected closeEditMenu(): void {
        this.cancelEditMenuClose();
        this.openEditMenuId.set(null);
    }

    /** Requests the selected user's profile. */
    protected requestUserProfile(userId: string): void {
        this.userProfileRequested.emit(userId);
    }

    /** Sends the reply currently entered in the contenteditable editor. */
    protected async sendReply(): Promise<void> {
        const editor = this.replyEditor?.nativeElement;
        const replyText = editor?.textContent?.trim();

        if (!replyText) {
            return;
        }

        const currentUser = this.authService.currentUser();
        if (!currentUser) {
            return;
        }

        await this.repliesService.sendReply(this.channelId, this.parentMessage.id, {
            senderId: currentUser.uid,
            senderName: currentUser.name,
            senderImageUrl: currentUser.avatarUrl,
            text: replyText,
        });

        if (editor) {
            editor.innerHTML = '';
        }

        requestAnimationFrame(() => this.scrollToBottom());
    }

    public ngOnInit(): void {
        this.repliesService.loadReplies(this.channelId, this.parentMessage.id);
    }

    public ngOnDestroy(): void {
        this.repliesService.stopListening();
    }
}
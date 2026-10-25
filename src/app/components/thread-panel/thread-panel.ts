import {
    AfterViewInit, Component, effect, ElementRef, HostListener, inject,
    Input, OnChanges, OnDestroy, OnInit, output, Renderer2, signal,
    SimpleChanges, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreadHeader } from '../thread-header/thread-header';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { ChatMessage } from '../../core/models/message.model';
import { ThreadRepliesService } from '../../core/services/thread-replies';
import { ChatMessagesService } from '../../core/services/chat-messages';
import { Auth } from '../../core/services/auth';
import { ChatModel } from '../../core/chat.model';
import { createMentionChannels, createMentionPeople, MentionItem } from '../chat-panel/mention';
import { ChatMessageMenu } from '../chat-panel/helpers/chat-message-menu';
import { ThreadMessage, ThreadReaction, mapThreadReactions, mapThreadReply } from './helpers/thread-message-view';
import { ThreadMessageScroll } from './helpers/thread-message-scroll';
import { ThreadMessageEdit } from './helpers/thread-message-edit';
import { ThreadMessageComposer } from './helpers/thread-message-composer';
import { ThreadMessageEmojiPicker, ThreadEmojiTarget } from './helpers/thread-message-emoji-picker';

@Component({
    selector: 'app-thread-panel',
    imports: [CommonModule, ThreadHeader, EmojiPicker],
    templateUrl: './thread-panel.html',
    styleUrl: './thread-panel.scss'
})
export class ThreadPanel implements AfterViewInit, OnInit, OnChanges, OnDestroy {
    private readonly repliesService = inject(ThreadRepliesService);
    private readonly authService = inject(Auth);
    private readonly chatModel = inject(ChatModel);
    private readonly renderer = inject(Renderer2);
    private readonly chatMessages = inject(ChatMessagesService);

    @Input({ required: true }) parentMessage!: ChatMessage;
    @Input({ required: true }) channelId!: string;
    @Input({ required: true }) conversationType!: 'channel' | 'direct-message';
    @Input({ required: true }) conversationLabel!: string;
    @ViewChild('threadMessages') private threadMessages?: ElementRef<HTMLDivElement>;
    @ViewChild('replyEditor') private replyEditor?: ElementRef<HTMLDivElement>;
    @ViewChild('threadMentionWrapper') private mentionWrapper?: ElementRef<HTMLDivElement>;

    readonly closeRequested = output<void>();
    readonly userProfileRequested = output<string>();
    protected readonly showMentionPicker = signal(false);
    private readonly messageMenu = new ChatMessageMenu();
    private readonly messageEdit = new ThreadMessageEdit(this.chatMessages, this.repliesService);
    private readonly emojiPicker = new ThreadMessageEmojiPicker();
    private readonly composer = new ThreadMessageComposer(
        this.renderer,
        () => this.replyEditor?.nativeElement,
        () => this.mentionPeople,
        () => this.mentionChannels
    );
    private readonly messageScroll = new ThreadMessageScroll(() => this.threadMessages?.nativeElement);

    protected readonly openEditMenuId = this.messageMenu.activeId;
    protected readonly pendingDeleteReplyId = this.messageMenu.pendingDeleteId;
    protected readonly editingReplyId = this.messageEdit.editingId;
    protected readonly editReplyText = this.messageEdit.text;
    protected readonly showEmojiPicker = this.emojiPicker.isOpen;
    protected readonly typedMentionSearch = this.composer.typedMentionSearch;
    protected readonly typedMentionIndex = this.composer.typedMentionIndex;
    protected readonly typedMentionItems = this.composer.typedMentionItems;
    private readonly emojiPickerTarget = this.emojiPicker.target;
    private readonly emojiReactionReplyId = this.emojiPicker.reactionReplyId;

    /** Watches thread replies and updates the scroll position. */
    constructor() {
        effect(() => {
            const replies = this.repliesService.replies();
            this.messageScroll.handleReplies(this.channelId, this.parentMessage.id, replies.at(-1)?.id);
        });
    }

    /** Loads replies when the thread opens. */
    ngOnInit(): void {
        this.repliesService.loadReplies(this.channelId, this.parentMessage.id);
    }

    /** Scrolls to the newest reply after rendering. */
    ngAfterViewInit(): void {
        this.messageScroll.scheduleBottomScroll();
    }

    /** Reloads replies when another parent message is selected. */
    ngOnChanges(changes: SimpleChanges): void {
        const parentChange = changes['parentMessage'];
        if (!parentChange || parentChange.firstChange) return;
        this.closeEditMenu();
        this.cancelEditReply();
        this.repliesService.stopListening();
        this.repliesService.loadReplies(this.channelId, this.parentMessage.id);
        this.messageScroll.scheduleBottomScroll();
    }

    /** Stops listening and cancels pending UI timers. */
    ngOnDestroy(): void {
        this.messageMenu.cancelClose();
        this.emojiPicker.destroy();
        this.repliesService.stopListening();
    }

    /** Focuses the thread reply editor. */
    public focusReplyInput(): void { this.replyEditor?.nativeElement.focus(); }

    /** Returns people for the mention picker. */
    protected get mentionPeople() { return createMentionPeople(this.authService.allUsers()); }

    /** Returns channels for the mention picker. */
    protected get mentionChannels() { return createMentionChannels(this.chatModel.channels()); }

    /** Returns thread replies prepared for display. */
    protected get replies(): ThreadMessage[] {
        const currentUserId = this.authService.currentUser()?.uid;
        return this.repliesService.replies().map((reply) => mapThreadReply(reply, currentUserId));
    }

    /** Returns parent message reactions prepared for display. */
    protected get parentReactions(): ThreadReaction[] {
        const currentUserId = this.authService.currentUser()?.uid;
        return mapThreadReactions(this.liveParentMessage.reactions ?? [], currentUserId);
    }

    /** Returns the current live version of the thread parent message. */
    protected get liveParentMessage(): ChatMessage {
        return this.chatMessages.messages().find((message) => message.id === this.parentMessage.id) ?? this.parentMessage;
    }

    /** Checks whether the parent message belongs to the current user. */
    protected isOwnParentMessage(): boolean {
        return this.liveParentMessage.senderId === this.authService.currentUser()?.uid;
    }

    /** Requests the selected user's profile. */
    protected requestUserProfile(userId: string): void { this.userProfileRequested.emit(userId); }

    /** Toggles the thread message options menu. */
    protected toggleEditMenu(messageId: string): void { this.messageMenu.toggle(messageId); }

    /** Schedules the message menu to close. */
    protected scheduleEditMenuClose(): void { this.messageMenu.scheduleClose(); }

    /** Cancels the scheduled message menu close. */
    protected cancelEditMenuClose(): void { this.messageMenu.cancelClose(); }

    /** Closes the message menu and its delete confirmation. */
    protected closeEditMenu(): void { this.messageMenu.close(); }

    /** Checks whether the parent message is being edited. */
    protected isEditingParentMessage(): boolean { return this.messageEdit.isParent(this.parentMessage.id); }

    /** Starts editing the parent message. */
    protected startEditParentMessage(): void {
        if (!this.isOwnParentMessage()) return;
        this.messageEdit.startParent(this.liveParentMessage);
        this.closeEditMenu();
        this.showEmojiPicker.set(false);
    }

    /** Saves the edited parent message. */
    protected async saveEditParentMessage(): Promise<void> {
        if (!this.isOwnParentMessage()) return;
        await this.messageEdit.saveParent(this.channelId, this.liveParentMessage);
        this.showEmojiPicker.set(false);
    }

    /** Checks whether the selected reply is being edited. */
    protected isEditingReply(replyId: string): boolean { return this.messageEdit.isReply(replyId); }

    /** Starts editing the selected reply. */
    protected startEditReply(reply: ThreadMessage): void {
        this.messageEdit.startReply(reply);
        this.closeEditMenu();
        this.showEmojiPicker.set(false);
    }

    /** Cancels editing the current thread message. */
    protected cancelEditReply(): void {
        this.messageEdit.cancel();
        this.showEmojiPicker.set(false);
    }

    /** Appends an emoji to the edited message. */
    protected addEmojiToEditReply(emoji: string): void {
        this.messageEdit.addEmoji(emoji);
        this.showEmojiPicker.set(false);
    }

    /** Updates the current thread edit text. */
    protected onEditReplyInput(event: Event): void {
        this.messageEdit.setText((event.target as HTMLTextAreaElement).value);
    }

    /** Saves the edited reply. */
    protected async saveEditReply(reply: ThreadMessage): Promise<void> {
        await this.messageEdit.saveReply(this.channelId, this.parentMessage.id, reply);
        this.showEmojiPicker.set(false);
    }

    /** Opens the delete confirmation for a reply. */
    protected requestDeleteReply(replyId: string): void { this.messageMenu.requestDelete(replyId); }

    /** Cancels the current reply deletion. */
    protected cancelDeleteReply(): void { this.messageMenu.cancelDelete(); }

    /** Checks whether the reply delete confirmation is open. */
    protected isDeleteReplyConfirmOpen(replyId: string): boolean { return this.messageMenu.isDeleteOpen(replyId); }

    /** Deletes the selected thread reply. */
    protected async deleteReply(replyId: string): Promise<void> {
        await this.repliesService.deleteReply(this.channelId, this.parentMessage.id, replyId);
        this.closeEditMenu();
    }

    /** Removes empty markup and updates mention suggestions. */
    protected handleEditorInput(event: Event): void { this.composer.handleEditorInput(event); }

    /** Updates mention suggestions from the current reply cursor. */
    protected updateTypedMentionSearch(): void { this.composer.updateTypedMentionSearch(); }

    /** Closes the typed mention suggestions. */
    protected closeTypedMentionSearch(): void { this.composer.closeTypedMentionSearch(); }

    /** Inserts a selected typed mention. */
    protected insertTypedMention(item: MentionItem): void { this.composer.insertTypedMention(item); }

    /** Handles keyboard input and sending replies. */
    protected onReplyEditorKeydown(event: KeyboardEvent): void {
        this.composer.handleKeydown(event, () => { void this.sendReply(); });
    }

    /** Saves the reply cursor before the mention button takes focus. */
    protected saveMentionButtonCursor(): void { this.composer.saveMentionButtonCursor(); }

    /** Saves the reply cursor before the emoji button takes focus. */
    protected saveEmojiButtonCursor(): void { this.composer.saveEmojiButtonCursor(); }

    /** Inserts an emoji at the saved reply cursor. */
    protected insertReplyEmoji(emoji: string): void {
        this.composer.insertReplyEmoji(emoji);
        this.showEmojiPicker.set(false);
    }

    /** Inserts a mention chosen from the picker. */
    protected insertPickerMention(item: MentionItem): void {
        this.composer.insertPickerMention(item);
        this.showMentionPicker.set(false);
    }

    /** Toggles the mention picker for the thread editor. */
    protected toggleMentionPicker(): void {
        this.showMentionPicker.update((open) => !open);
        this.showEmojiPicker.set(false);
        this.closeTypedMentionSearch();
    }

    /** Switches the shared emoji picker to another target. */
    private switchEmojiPickerTarget(target: ThreadEmojiTarget, replyId: string | null = null): void {
        this.emojiPicker.switch(target, replyId);
    }

    /** Toggles the emoji picker for the thread input. */
    protected toggleEmojiPicker(): void {
        this.showMentionPicker.set(false);
        this.closeTypedMentionSearch();
        this.switchEmojiPickerTarget('input');
    }

    /** Toggles the emoji picker for the parent reaction. */
    protected toggleParentReactionPicker(): void { this.switchEmojiPickerTarget('parent-reaction'); }

    /** Toggles the emoji picker for a reply reaction. */
    protected toggleReplyReactionPicker(replyId: string): void {
        this.switchEmojiPickerTarget('reply-reaction', replyId);
    }

    /** Toggles the emoji picker for the edited message. */
    protected toggleEditReplyEmojiPicker(): void { this.switchEmojiPickerTarget('edit'); }

    /** Toggles the current user's reaction on the parent message. */
    protected async toggleParentReaction(icon: string): Promise<void> {
        const currentUser = this.authService.currentUser();
        if (!currentUser) return;
        await this.chatMessages.toggleReaction(this.channelId, this.liveParentMessage.id, icon, {
            uid: currentUser.uid, name: currentUser.name
        });
        this.showEmojiPicker.set(false);
    }

    /** Toggles the current user's reaction on a thread reply. */
    protected async toggleReplyReaction(replyId: string, icon: string): Promise<void> {
        const currentUser = this.authService.currentUser();
        if (!currentUser) return;
        await this.repliesService.toggleReaction(this.channelId, this.parentMessage.id, replyId, icon, {
            uid: currentUser.uid, name: currentUser.name
        });
    }

    /** Handles the emoji selected from the shared picker. */
    protected async handleEmojiSelected(emoji: string): Promise<void> {
        if (this.emojiPickerTarget() === 'parent-reaction') await this.toggleParentReaction(emoji);
        else if (this.emojiPickerTarget() === 'reply-reaction') await this.applyReplyReactionEmoji(emoji);
        else if (this.emojiPickerTarget() === 'edit') this.addEmojiToEditReply(emoji);
        else this.insertReplyEmoji(emoji);
        this.showEmojiPicker.set(false);
    }

    /** Adds the selected emoji to the targeted reply reaction. */
    private async applyReplyReactionEmoji(emoji: string): Promise<void> {
        const replyId = this.emojiReactionReplyId();
        if (!replyId) return;
        await this.toggleReplyReaction(replyId, emoji);
        this.emojiReactionReplyId.set(null);
    }

    /** Sends the reply currently entered in the editor. */
    protected async sendReply(): Promise<void> {
        const replyText = this.composer.getReplyText();
        if (!replyText) return;
        const currentUser = this.authService.currentUser();
        if (!currentUser) return;
        await this.repliesService.sendReply(this.channelId, this.parentMessage.id, {
            senderId: currentUser.uid, senderName: currentUser.name,
            senderImageUrl: currentUser.avatarUrl, text: replyText
        });
        this.composer.clearReply();
        this.messageScroll.scheduleBottomScroll();
    }

    /** Closes open thread controls when clicking outside them. */
    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        const target = event.target as Element;
        const insideMention = this.mentionWrapper?.nativeElement.contains(target);
        if (this.showMentionPicker() && !insideMention) this.showMentionPicker.set(false);
        const insideEmoji = target.closest(
            '.thread-input__emoji, .thread-input-emoji-picker, .thread-message__add-reaction, ' +
            '.thread-message__hover-action--reaction, .thread-message__edit-emoji'
        );
        if (this.showEmojiPicker() && !insideEmoji) this.showEmojiPicker.set(false);
        const insideEdit = target.closest('.thread-message__edit-box, .thread-message__edit-menu-wrapper');
        const insideEditEmoji = this.emojiPickerTarget() === 'edit' && !!target.closest('.thread-input-emoji-picker');
        if (this.editingReplyId() && !insideEdit && !insideEditEmoji) this.cancelEditReply();
        const insideMenu = target.closest('.thread-message__edit-menu-wrapper');
        if (this.openEditMenuId() && !insideMenu) this.closeEditMenu();
    }
}

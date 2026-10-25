import {
  Component, signal, effect, ElementRef, HostListener, ViewChild,
  Renderer2, inject, OnInit, OnDestroy, OnChanges, SimpleChanges,
  Input, output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { ChatMessagesService } from './../../core/services/chat-messages';
import { ChatMessage, Reaction } from './../../core/models/message.model';
import { Auth } from './../../core/services/auth';
import { ChatModel } from './../../core/chat.model';
import 'emoji-picker-element';
import {
  createMentionChannels, createMentionPeople, MentionChannel,
  MentionItem, MentionPerson
} from './mention';
import { ChatMessageMenu } from './helpers/chat-message-menu';
import { ChatMessageScroll } from './helpers/chat-message-scroll';
import { ChatMessageEdit } from './helpers/chat-message-edit';
import { ChatMessageReactions } from './helpers/chat-message-reactions';
import { ChatMessageInput } from './helpers/chat-message-input';
import { ChatMessageMentions } from './helpers/chat-message-mentions';
import { ChatMessageEmojiPicker } from './helpers/chat-message-emoji-picker';
import {
  isOutsideEmojiPicker, isOutsideMentionPicker,
  isOutsideMessageEditor, isOutsideMessageMenu
} from './helpers/chat-message-outside-click';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, EmojiPicker],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.scss'
})
export class ChatPanel implements OnInit, OnDestroy, OnChanges {
  private readonly renderer = inject(Renderer2);
  private readonly chatMessages = inject(ChatMessagesService);
  private readonly auth = inject(Auth);
  private readonly chatModel = inject(ChatModel);
  private readonly requestedMessageId = signal<string | null>(null);

  @Input() channelId = '';
  @Input() composeMode = false;
  @Input() conversationType: 'channel' | 'direct-message' = 'channel';
  @Input() conversationLabel = '';
  @Input() set scrollToMessageId(messageId: string | null) { this.requestedMessageId.set(messageId); }
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLElement>;
  @ViewChild('emotePicker') emotePicker!: ElementRef<HTMLDivElement>;
  @ViewChild('mentionPicker') mentionPicker!: ElementRef<HTMLDivElement>;
  @ViewChild('mentionBtn') mentionBtn!: ElementRef<HTMLDivElement>;
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  readonly messageSent = output<void>();
  readonly userProfileRequested = output<string>();
  readonly messageScrollHandled = output<void>();
  readonly threadRequested = output<ChatMessage>();
  readonly showMentionPicker = signal(false);

  private readonly messageMenu = new ChatMessageMenu();
  private readonly messageEdit = new ChatMessageEdit(this.chatMessages);
  private readonly messageReactions = new ChatMessageReactions(this.chatMessages);
  private readonly messageEmojiPicker = new ChatMessageEmojiPicker(() => this.showMentionPicker.set(false));
  private readonly messageInputEditor = new ChatMessageInput(this.renderer, () => this.messageInput.nativeElement);
  private readonly typedMentions = new ChatMessageMentions(
    () => this.messageInput.nativeElement,
    () => this.people,
    () => this.channels
  );
  private readonly messageScroll = new ChatMessageScroll(
    () => this.messagesContainer?.nativeElement,
    () => this.messageScrollHandled.emit()
  );

  readonly showEmotePicker = this.messageEmojiPicker.isOpen;
  readonly isEmpty = this.messageInputEditor.isEmpty;
  readonly typedMentionSearch = this.typedMentions.search;
  readonly typedMentionIndex = this.typedMentions.selectedIndex;
  readonly typedMentionItems = this.typedMentions.items;
  readonly activeMessageMenuId = this.messageMenu.activeId;
  readonly pendingDeleteMessageId = this.messageMenu.pendingDeleteId;
  readonly editingMessageId = this.messageEdit.editingId;
  readonly editText = this.messageEdit.text;
  protected readonly maxVisibleReactions = this.messageReactions.visibleLimit;
  protected readonly expandedReactionIds = this.messageReactions.expandedMessageIds;
  private readonly emojiPickerTarget = this.messageEmojiPicker.target;
  private readonly emojiReactionMessageId = this.messageEmojiPicker.reactionMessageId;

  /** Watches message changes and updates the scroll position. */
  constructor() {
    effect(() => this.messageScroll.handle(this.chatMessages.messages(), this.requestedMessageId(), this.channelId));
  }

  /** Loads messages when a conversation is initially opened. */
  ngOnInit(): void {
    if (this.composeMode || !this.channelId) return;
    this.chatMessages.loadMessages(this.channelId);
  }

  /** Reloads messages when the active conversation changes. */
  ngOnChanges(changes: SimpleChanges): void {
    if (this.composeMode || !this.channelId) return;
    if (!changes['channelId'] || changes['channelId'].firstChange) return;
    this.chatMessages.stopListening();
    this.chatMessages.loadMessages(this.channelId);
    this.clearInputAfterConversationChange();
  }

  /** Cleans up message listeners and pending UI timers. */
  ngOnDestroy(): void {
    this.cancelMessageMenuClose();
    this.messageEmojiPicker.destroy();
    this.chatMessages.stopListening();
  }

  /** Returns the placeholder for the active conversation. */
  protected get messagePlaceholder(): string {
    return this.conversationType === 'channel'
      ? `Nachricht an #${this.conversationLabel}` : `Nachricht an ${this.conversationLabel}`;
  }

  /** Returns available mention channels. */
  get channels(): MentionChannel[] { return createMentionChannels(this.chatModel.channels()); }

  /** Returns available mention users. */
  get people(): MentionPerson[] { return createMentionPeople(this.auth.allUsers()); }

  /** Returns messages of the active conversation. */
  get messages(): ChatMessage[] { return this.chatMessages.messages(); }

  /** Returns the authenticated user. */
  private get currentUser() { return this.auth.currentUser(); }

  /** Focuses the main message input. */
  public focusMessageInput(): void { this.messageInput?.nativeElement.focus(); }

  /** Returns the message identifier for tracking. */
  trackByMessageId(index: number, message: ChatMessage): string { return message.id; }

  /** Checks whether the current user sent a message. */
  isOwnMessage(senderId: string): boolean { return senderId === this.currentUser?.uid; }

  /** Requests the selected user's profile. */
  protected requestUserProfile(userId: string): void { this.userProfileRequested.emit(userId); }

  /** Opens the requested message thread. */
  openThread(message: ChatMessage): void { this.threadRequested.emit(message); }

  /** Formats the time of the newest thread reply. */
  protected formatLastReplyTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  }

  /** Toggles the message options menu. */
  toggleMessageMenu(messageId: string): void { this.messageMenu.toggle(messageId); }

  /** Checks whether the message options menu is open. */
  isMessageMenuOpen(messageId: string): boolean { return this.messageMenu.isOpen(messageId); }

  /** Closes the message options menu. */
  closeMessageMenu(): void { this.messageMenu.close(); }

  /** Schedules the message options menu to close. */
  scheduleMessageMenuClose(): void { this.messageMenu.scheduleClose(); }

  /** Cancels the scheduled message menu close. */
  cancelMessageMenuClose(): void { this.messageMenu.cancelClose(); }

  /** Opens the delete confirmation for a message. */
  requestDeleteMessage(messageId: string): void { this.messageMenu.requestDelete(messageId); }

  /** Cancels the message delete confirmation. */
  cancelDeleteMessage(): void { this.messageMenu.cancelDelete(); }

  /** Checks whether a delete confirmation is open. */
  isDeleteConfirmOpen(messageId: string): boolean { return this.messageMenu.isDeleteOpen(messageId); }

  /** Deletes the selected message and closes its menu. */
  async deleteMessage(message: ChatMessage): Promise<void> {
    await this.chatMessages.deleteMessage(this.channelId, message.id);
    this.closeMessageMenu();
  }

  /** Closes an open message menu when hovering over another message. */
  onMessageHover(messageId: string): void { this.messageMenu.closeForOtherMessage(messageId); }

  /** Toggles the shared emoji picker for a reaction. */
  toggleReactionPicker(messageId: string): void { this.switchEmojiPickerTarget('reaction', messageId); }

  /** Toggles a message reaction for the current user. */
  async toggleReaction(message: ChatMessage, icon: string): Promise<void> {
    const user = this.currentUser;
    if (!user) return;
    await this.messageReactions.toggle(this.channelId, message, icon, { uid: user.uid, name: user.name });
    this.showEmotePicker.set(false);
    this.emojiReactionMessageId.set(null);
  }

  /** Checks whether the current user added a reaction. */
  hasReacted(reaction: Reaction): boolean {
    return this.messageReactions.hasReacted(reaction, this.currentUser?.uid);
  }

  /** Returns the names of users who added a reaction. */
  reactionTooltip(reaction: Reaction): string {
    return this.messageReactions.tooltip(reaction, this.currentUser?.uid);
  }

  /** Updates the visible reaction limit after resizing. */
  @HostListener('window:resize')
  protected updateReactionLimit(): void { this.messageReactions.updateVisibleLimit(); }

  /** Returns the currently visible reactions for a message. */
  protected visibleReactions(message: ChatMessage): Reaction[] { return this.messageReactions.visible(message); }

  /** Expands or collapses additional reactions. */
  protected toggleReactionOverflow(messageId: string): void { this.messageReactions.toggleExpanded(messageId); }

  /** Toggles the emoji picker for the message input. */
  toggleEmotePicker(): void {
    this.saveCursorPosition();
    this.switchEmojiPickerTarget('input');
  }

  /** Toggles the emoji picker for an edited message. */
  toggleEditEmotePicker(): void { this.switchEmojiPickerTarget('edit'); }

  /** Switches the shared emoji picker to another target. */
  private switchEmojiPickerTarget(target: 'input' | 'reaction' | 'edit', messageId: string | null = null): void {
    this.messageEmojiPicker.switch(target, messageId);
  }

  /** Handles the selected emoji for the active picker target. */
  async handleEmojiSelected(emoji: string): Promise<void> {
    if (this.emojiPickerTarget() === 'reaction') {
      await this.applySelectedReaction(emoji);
      return;
    }
    if (this.emojiPickerTarget() === 'edit') {
      this.addEmojiToEdit(emoji);
      return;
    }
    this.insertEmote(emoji);
  }

  /** Applies the selected emoji as a message reaction. */
  private async applySelectedReaction(emoji: string): Promise<void> {
    const messageId = this.emojiReactionMessageId();
    const message = this.messages.find((currentMessage) => currentMessage.id === messageId);
    if (!message) return;
    await this.toggleReaction(message, emoji);
  }

  /** Toggles the mention picker for the message input. */
  toggleMentionPicker(): void {
    this.saveCursorPosition();
    this.showMentionPicker.update((open) => !open);
    this.showEmotePicker.set(false);
  }

  /** Updates the editor state and its mention suggestions. */
  onInput(): void {
    this.updateEmptyState();
    this.saveCursorPosition();
    if (this.typedMentions.updateSearch()) {
      this.showEmotePicker.set(false);
      this.showMentionPicker.set(false);
    }
  }

  /** Handles keyboard input and typed mention navigation. */
  onEditorKeydown(event: KeyboardEvent): void {
    this.typedMentions.handleKeydown(event, (item) => this.insertTypedMention(item), () => this.onEnterKey(event));
  }

  /** Closes the typed mention suggestions. */
  closeTypedMentionSearch(): void { this.typedMentions.close(); }

  /** Saves the cursor position in the message editor. */
  saveCursorPosition(): void { this.messageInputEditor.saveCursorPosition(); }

  /** Inserts an emoji into the message editor. */
  insertEmote(emoji: string): void {
    this.messageInputEditor.insertEmoji(emoji);
    this.showEmotePicker.set(false);
  }

  /** Inserts a selected person or channel mention. */
  insertMention(item: MentionItem): void {
    this.messageInputEditor.insertMention(item);
    this.showMentionPicker.set(false);
  }

  /** Replaces a typed mention query with the selected mention. */
  insertTypedMention(item: MentionItem): void {
    const search = this.typedMentionSearch();
    if (!search || !this.messageInputEditor.prepareTypedMention(search)) return;
    this.closeTypedMentionSearch();
    this.insertMention(item);
  }

  /** Refreshes the empty state of the message input. */
  private updateEmptyState(): void { this.messageInputEditor.updateEmptyState(); }

  /** Returns the message input as plain text. */
  getPlainTextValue(): string { return this.messageInputEditor.getPlainTextValue(); }

  /** Clears the editor after switching conversations. */
  private clearInputAfterConversationChange(): void {
    if (!this.messageInput) return;
    this.messageInputEditor.clearForConversationChange();
    this.closeTypedMentionSearch();
  }

  /** Sends the current message to the selected conversation. */
  async sendMessage(): Promise<void> {
    const text = this.getPlainTextValue();
    if (!text || !this.channelId) return;
    const user = this.currentUser;
    if (!user) return;
    await this.chatMessages.sendMessage(this.channelId, {
      senderId: user.uid, senderName: user.name, senderImageUrl: user.avatarUrl, text
    });
    this.clearSentMessageInput();
    this.messageSent.emit();
  }

  /** Clears the editor after a message is sent. */
  private clearSentMessageInput(): void {
    this.messageInput.nativeElement.textContent = '';
    this.closeTypedMentionSearch();
    this.updateEmptyState();
  }

  /** Sends the message when Enter is pressed without Shift. */
  onEnterKey(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.shiftKey) return;
    event.preventDefault();
    this.sendMessage();
  }

  /** Checks whether the selected message is being edited. */
  isEditingMessage(messageId: string): boolean { return this.messageEdit.isEditing(messageId); }

  /** Starts editing the selected message. */
  startEditMessage(message: ChatMessage): void {
    this.messageEdit.start(message);
    this.showEmotePicker.set(false);
  }

  /** Cancels the current edit and its emoji picker. */
  cancelEditMessage(): void {
    this.messageEdit.cancel();
    if (this.emojiPickerTarget() === 'edit') this.showEmotePicker.set(false);
  }

  /** Cancels the currently active message edit. */
  public cancelActiveMessageEdit(): void {
    if (!this.editingMessageId()) return;
    this.cancelEditMessage();
  }

  /** Saves an edited message and closes its emoji picker. */
  async saveEditMessage(message: ChatMessage): Promise<void> {
    await this.messageEdit.save(this.channelId, message);
    if (this.emojiPickerTarget() === 'edit') this.showEmotePicker.set(false);
  }

  /** Updates the text of the message being edited. */
  onEditInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.messageEdit.setText(textarea.value);
  }

  /** Adds an emoji to the currently edited message. */
  addEmojiToEdit(emoji: string): void {
    this.messageEdit.addEmoji(emoji);
    this.showEmotePicker.set(false);
  }

  /** Handles outside clicks for pickers, editors and message menus. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const emojiPicker = this.emotePicker?.nativeElement;
    if (this.showEmotePicker() && isOutsideEmojiPicker(event, emojiPicker)) this.showEmotePicker.set(false);
    if (this.showMentionPicker() && isOutsideMentionPicker(
      event, this.mentionPicker?.nativeElement, this.mentionBtn?.nativeElement
    )) this.showMentionPicker.set(false);
    if (this.editingMessageId() && isOutsideMessageEditor(
      event, this.emojiPickerTarget() === 'edit', emojiPicker
    )) this.cancelEditMessage();
    if (this.activeMessageMenuId() && isOutsideMessageMenu(event)) this.closeMessageMenu();
  }
}
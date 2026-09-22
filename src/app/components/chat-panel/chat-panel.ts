import {
  Component, signal, ElementRef, HostListener, ViewChild,
  Renderer2, inject, OnInit, OnDestroy, OnChanges, SimpleChanges,
  Input, output, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { ChatMessagesService } from './../../core/services/chat-messages';
import { ChatMessage, Reaction } from './../../core/models/message.model';
import { Auth } from './../../core/services/auth';
import 'emoji-picker-element';
import { ChatModel } from './../../core/chat.model';
import {
  createMentionChannels, createMentionPeople, filterMentionChannels,
  filterMentionPeople, getMentionSearch, getTextBeforeCursor,
  MentionChannel, MentionItem, MentionPerson, MentionSearch,
  getMentionReplacementRange
} from './mention';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, EmojiPicker],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.scss',
})
export class ChatPanel implements OnInit, OnDestroy, OnChanges {
  private renderer = inject(Renderer2);
  private chatMessages = inject(ChatMessagesService);
  private auth = inject(Auth);
  private chatModel = inject(ChatModel);

  @Input({ required: true }) channelId!: string;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLElement>;
  @ViewChild('emotePicker') emotePicker!: ElementRef<HTMLDivElement>;
  @ViewChild('emoteBtn') emoteBtn!: ElementRef<HTMLDivElement>;
  @ViewChild('mentionPicker') mentionPicker!: ElementRef<HTMLDivElement>;
  @ViewChild('mentionBtn') mentionBtn!: ElementRef<HTMLDivElement>;

  message = signal<string>('');
  showEmotePicker = signal<boolean>(false);
  showMentionPicker = signal<boolean>(false);
  isEmpty = signal<boolean>(true);
  typedMentionSearch = signal<MentionSearch | null>(null);
  typedMentionIndex = signal<number>(0);

  readonly typedMentionItems = computed<MentionItem[]>(() => {
    const search = this.typedMentionSearch();
    if (!search) return [];
    return search.trigger === '@'
      ? filterMentionPeople(this.people, search.query)
      : filterMentionChannels(this.channels, search.query);
  });

  private savedRange: Range | null = null;

  get channels(): MentionChannel[] {
    return createMentionChannels(this.chatModel.channels());
  }

  get people(): MentionPerson[] {
    return createMentionPeople(this.auth.allUsers());
  }

  // ---------------- Chat-Listener -----------------

  get messages(): ChatMessage[] {
    return this.chatMessages.messages();
  }

  async ngOnInit(): Promise<void> {
    this.chatMessages.loadMessages(this.channelId);
    console.log('init');
  }

  private get currentUser() {
    return this.auth.currentUser();
  }

  ngOnDestroy(): void {
    this.chatMessages.stopListening();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channelId'] && !changes['channelId'].firstChange) {
      this.chatMessages.stopListening();
      this.chatMessages.loadMessages(this.channelId);
      console.log('changes');
    }
  }

  // ---------------- Chat-features -----------------


activeMessageMenuId = signal<string | null>(null);
pendingDeleteMessageId = signal<string | null>(null);
  activeReactionPickerId = signal<string | null>(null);

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  isOwnMessage(senderId: string): boolean {
    return senderId === this.currentUser?.uid;
  }

  toggleReactionPicker(pickerId: string): void {
    this.activeReactionPickerId.update(current => current === pickerId ? null : pickerId);
  }

  isReactionPickerOpen(pickerId: string): boolean {
    return this.activeReactionPickerId() === pickerId;
  }

  async toggleReaction(message: ChatMessage, icon: string): Promise<void> {
    const user = this.currentUser;
    if (!user) return;

    await this.chatMessages.toggleReaction(
      this.channelId,
      message.id,
      icon,
      { uid: user.uid, name: user.name }
    );
    this.activeReactionPickerId.set(null);
  }

  hasReacted(reaction: Reaction): boolean {
    /* MUSS SPÄTER ENTFERNT WERDEN ODER ÜBERARBEITET */
    if (!reaction.reactedBy) {
      return false;
    }
    return reaction.reactedBy.some((u) => u.uid === this.currentUser?.uid);
  }

  reactionTooltip(reaction: Reaction): string {
    /* MUSS SPÄTER ENTFERNT WERDEN ODER ÜBERARBEITET */
    if (!reaction.reactedBy) {
      return '';
    }
    return reaction.reactedBy
      .map((u) => (u.uid === this.currentUser?.uid ? 'Du' : u.name))
      .join(', ');
  }

  

  toggleMessageMenu(messageId: string): void {
  const isSameMenu = this.activeMessageMenuId() === messageId;
  this.activeMessageMenuId.set(isSameMenu ? null : messageId);
  this.pendingDeleteMessageId.set(null);
}

isMessageMenuOpen(messageId: string): boolean {
  return this.activeMessageMenuId() === messageId;
}

closeMessageMenu(): void {
  this.activeMessageMenuId.set(null);
  this.pendingDeleteMessageId.set(null);
}

requestDeleteMessage(messageId: string): void {
  this.pendingDeleteMessageId.set(messageId);
}

cancelDeleteMessage(): void {
  this.pendingDeleteMessageId.set(null);
}

isDeleteConfirmOpen(messageId: string): boolean {
  return this.pendingDeleteMessageId() === messageId;
}

async deleteMessage(message: ChatMessage): Promise<void> {
  await this.chatMessages.deleteMessage(this.channelId, message.id);
  this.closeMessageMenu();
}

  // ------------------ Emote-/Mention-Picker --------------

  toggleEmotePicker(): void {
    this.saveCursorPosition();
    this.showEmotePicker.update(open => !open);
    this.showMentionPicker.set(false);
  }

  toggleMentionPicker(): void {
    this.saveCursorPosition();
    this.showMentionPicker.update(open => !open);
    this.showEmotePicker.set(false);
  }

  onInput(): void {
    this.updateEmptyState();
    this.saveCursorPosition();
    this.updateTypedMentionSearch();
  }

  /** Updates the active mention search from the current cursor position. */
  private updateTypedMentionSearch(): void {
    const textBeforeCursor = getTextBeforeCursor(
      this.messageInput.nativeElement
    );
    const search = getMentionSearch(textBeforeCursor);
    this.typedMentionSearch.set(search);
    this.typedMentionIndex.set(0);
    if (search) {
      this.showEmotePicker.set(false);
      this.showMentionPicker.set(false);
    }
  }

  /** Handles keyboard navigation for typed mention suggestions. */
  onEditorKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && event.shiftKey) return;
    if (event.key === 'Escape') return this.closeTypedMentionSearch();
    const items = this.typedMentionItems();
    if (!this.typedMentionSearch() || items.length === 0) {
      if (event.key === 'Enter') this.onEnterKey(event);
      return;
    }
    if (event.key === 'ArrowDown') this.moveMentionSelection(event, 1);
    if (event.key === 'ArrowUp') this.moveMentionSelection(event, -1);
    if (event.key === 'Enter') this.confirmMentionSelection(event);
  }

  /** Moves the selected mention suggestion in the given direction. */
  private moveMentionSelection(
    event: KeyboardEvent,
    direction: number
  ): void {
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

  /** Closes the typed mention suggestions. */
  closeTypedMentionSearch(): void {
    this.typedMentionSearch.set(null);
    this.typedMentionIndex.set(0);
  }

  saveCursorPosition(): void {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const editor = this.messageInput.nativeElement;

    if (editor.contains(range.commonAncestorContainer)) {
      this.savedRange = range.cloneRange();
    }
  }

  private restoreCursorPosition(): Range {
    const editor = this.messageInput.nativeElement;
    editor.focus();

    const selection = document.getSelection();
    if (!selection) {
      throw new Error('Selection API not available');
    }

    if (this.savedRange) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
      return this.savedRange;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
  }

  insertEmote(emoji: string): void {
    const range = this.restoreCursorPosition();
    range.deleteContents();

    const textNode = this.renderer.createText(emoji);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);

    this.savedRange = range.cloneRange();
    this.showEmotePicker.set(false);
    this.updateEmptyState();
  }

  insertMention(item: MentionItem): void {
    const range = this.restoreCursorPosition();
    range.deleteContents();

    const prefix = item.type === 'channel' ? '#' : '@';

    const pill = this.renderer.createElement('span') as HTMLSpanElement;
    this.renderer.addClass(pill, 'mention-pill');
    this.renderer.setAttribute(pill, 'contenteditable', 'false');
    this.renderer.setAttribute(pill, 'data-type', item.type);
    this.renderer.setAttribute(pill, 'data-name', item.name);

    const pillText = this.renderer.createText(`${prefix}${item.name}`);
    this.renderer.appendChild(pill, pillText);

    range.insertNode(pill);

    // space after pill so you can continue writung
    const spaceNode = this.renderer.createText('\u00A0');
    range.setStartAfter(pill);
    range.collapse(true);
    range.insertNode(spaceNode);

    range.setStartAfter(spaceNode);
    range.setEndAfter(spaceNode);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);

    this.savedRange = range.cloneRange();
    this.showMentionPicker.set(false);
    this.updateEmptyState();
  }

  /** Replaces the typed mention search with the existing mention pill. */
  insertTypedMention(item: MentionItem): void {
    const search = this.typedMentionSearch();
    if (!search || !this.savedRange) return;
    const replacementRange = getMentionReplacementRange(
      this.messageInput.nativeElement,
      this.savedRange,
      search
    );
    if (!replacementRange) return;
    this.savedRange = replacementRange;
    this.typedMentionSearch.set(null);
    this.insertMention(item);
  }

  private updateEmptyState(): void {
    const editor = this.messageInput.nativeElement;
    this.isEmpty.set(
      editor.textContent?.trim().length === 0 &&
      editor.querySelectorAll('.mention-pill').length === 0
    );
  }

  // --------------- prep for backend submission ---------------
  getPlainTextValue(): string {
    const editor = this.messageInput.nativeElement;
    let result = '';

    editor.childNodes.forEach(node => {
      result += node.textContent ?? '';
    });

    return result.trim();
  }

  async sendMessage(): Promise<void> {
    const text = this.getPlainTextValue();
    if (!text) return;

    const user = this.currentUser;
    if (!user) return;

    await this.chatMessages.sendMessage(this.channelId, {
      senderId: user.uid,
      senderName: user.name,
      senderImageUrl: user.avatarUrl,
      text,
    });

    this.messageInput.nativeElement.textContent = '';
    this.closeTypedMentionSearch();
    this.updateEmptyState();
  }

  onEnterKey(event: Event): void {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.shiftKey) return;
    event.preventDefault();
    this.sendMessage();
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;

    if (this.showEmotePicker()) {
      const clickedInsideEmotePicker = this.emotePicker?.nativeElement.contains(target);
      const clickedOnEmoteBtn = this.emoteBtn?.nativeElement.contains(target);
      if (!clickedInsideEmotePicker && !clickedOnEmoteBtn) {
        this.showEmotePicker.set(false);
      }
    }

    if (this.showMentionPicker()) {
      const clickedInsideMentionPicker = this.mentionPicker?.nativeElement.contains(target);
      const clickedOnMentionBtn = this.mentionBtn?.nativeElement.contains(target);
      if (!clickedInsideMentionPicker && !clickedOnMentionBtn) {
        this.showMentionPicker.set(false);
      }
    }

    if (this.activeReactionPickerId()) {
      const clickedElement = event.target as Element;
      const clickedInsideReactionPicker = clickedElement.closest('.instant-reaction-btn , .interaction-btn');
      if (!clickedInsideReactionPicker) {
        this.activeReactionPickerId.set(null);
      }
    }

  }


  // ----------------- Edit Message -----------------

  editingMessageId = signal<string | null>(null);
  editText = signal<string>('');

  isEditingMessage(messageId: string): boolean {
    return this.editingMessageId() === messageId;
  }

  // temp. later is used in the hover button
  startEditMessage(message: ChatMessage): void {
    this.editingMessageId.set(message.id);
    this.editText.set(message.text);
  }

  cancelEditMessage(): void {
    this.editingMessageId.set(null);
    this.editText.set('');
  }

  async saveEditMessage(message: ChatMessage): Promise<void> {
    const newText = this.editText().trim();
    if (!newText || newText === message.text) {
      this.cancelEditMessage();
      return;
    }
    await this.chatMessages.updateMessage(this.channelId, message.id, newText);
    this.cancelEditMessage();
  }



  // ---------------- Thread -----------------
  readonly threadRequested = output<ChatMessage>();

  openThread(message: ChatMessage): void {
    this.threadRequested.emit(message);
  }

  protected formatLastReplyTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' Uhr';
  }


}
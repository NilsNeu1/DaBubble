import { Component, signal, ElementRef, HostListener, ViewChild, Renderer2, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { ChatMessagesService } from './../../core/services/chat-messages';
import { ChatMessage } from './../../core/models/message.model';

interface MentionPerson {
  type: 'person';
  name: string;
  imageUrl: string;
}

interface MentionChannel {
  type: 'channel';
  name: string;
  imageUrl: string;
}

type MentionItem = MentionPerson | MentionChannel;

// interface Reaction {
//   icon: string;
//   count: number;
// }

// interface Message {
//   id: string;
//   senderId: string;
//   senderName: string;
//   senderImageUrl: string;
//   timestamp: string;
//   text: string;
//   hasThread: boolean;
//   lastReply?: string;
//   reactions: Reaction[];
// }

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, EmojiPicker],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.scss',
})
export class ChatPanel implements OnInit, OnDestroy {
  private renderer = inject(Renderer2);
  private chatMessages = inject(ChatMessagesService);

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
  private savedRange: Range | null = null;

  readonly emojis: string[] = [
    '😀', '😂', '😍', '🤔', '😅', '😢', '😡', '👍',
    '👎', '🙏', '🎉', '🔥', '❤️', '👀', '🚀', '✅'
  ];

  readonly channels: MentionChannel[] = [
    { type: 'channel', name: 'Entwicklerteam', imageUrl: '/assets/Workspace_logo.png' },
    { type: 'channel', name: 'Allgemein', imageUrl: '/assets/Workspace_logo.png' }
  ];

  readonly people: MentionPerson[] = [
    { type: 'person', name: 'Dominik R', imageUrl: '/assets/02.Charaters.png' },
    { type: 'person', name: 'Fernando CR', imageUrl: '/assets/02.Charaters.png' },
    { type: 'person', name: 'Riccardo S', imageUrl: '/assets/02.Charaters.png' },
    { type: 'person', name: 'Nils N', imageUrl: '/assets/02.Charaters.png' }
  ];

  // ---------------- Chat-Dummy -----------------
  currentUserId: string = 'u1';

  get messages(): ChatMessage[] {
    return this.chatMessages.messages();
  }

  // ngOnInit(): void {
  //   this.chatMessages.loadMessages(this.channelId);
  // }

  ngOnDestroy(): void {
    this.chatMessages.stopListening();
  }


  // messages: Message[] = [
  //   {
  //     id: 'm1',
  //     senderId: 'u2',
  //     senderName: 'Erika Mustermann',
  //     senderImageUrl: '/assets/01.Charaters.png',
  //     timestamp: '2:00 PM',
  //     text: 'styling test',
  //     hasThread: true,
  //     lastReply: 'Letzte Antwort 14:55',
  //     reactions: [{ icon: '👍', count: 1 }]
  //   },
  //   {
  //     id: 'm2',
  //     senderId: 'u1',
  //     senderName: 'Frederik Beck',
  //     senderImageUrl: '/assets/02.Charaters.png',
  //     timestamp: '3:06 PM',
  //     text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  //     hasThread: false,
  //     reactions: [
  //       { icon: '🚀', count: 1 },
  //       { icon: '✅', count: 1 }
  //     ]
  //   }
  // ];
  // ---------------- Chat-features -----------------
  readonly quickReactions: string[] = ['👍', '❤️', '😂', '🎉', '👀', '✅'];

  activeReactionPickerId = signal<string | null>(null);

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  isOwnMessage(senderId: string): boolean {
    return senderId === this.currentUserId;
  }

  toggleReactionPicker(pickerId: string): void {
    this.activeReactionPickerId.update(current => current === pickerId ? null : pickerId);
  }

  isReactionPickerOpen(pickerId: string): boolean {
    return this.activeReactionPickerId() === pickerId;
  }

  async addReaction(message: ChatMessage, icon: string): Promise<void> {
    await this.chatMessages.addReaction(
      this.channelId,
      message.id,
      icon,
      message.reactions
    );
    this.activeReactionPickerId.set(null);
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

    await this.chatMessages.sendMessage(this.channelId, {
      senderId: this.currentUserId,
      senderName: '', // from Auth-Service
      senderImageUrl: '', // from Auth-Service
      text,
    });

    this.messageInput.nativeElement.textContent = '';
    this.updateEmptyState();
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


  async ngOnInit(): Promise<void> {
  this.chatMessages.loadMessages(this.channelId);

   // TEMPORÄR!!   AUF KEINEN FALL WIEDER EINKOMMENTIEREN!!!
  //  await this.chatMessages.seedDummyMessages(this.channelId);
}



}
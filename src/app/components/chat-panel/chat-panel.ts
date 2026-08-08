import { Component, signal, ElementRef, HostListener, ViewChild, Renderer2, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.scss',
})
export class ChatPanel {
  private renderer = inject(Renderer2);

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

  // prep for backend submission
  getPlainTextValue(): string {
    const editor = this.messageInput.nativeElement;
    let result = '';

    editor.childNodes.forEach(node => {
      result += node.textContent ?? '';
    });

    return result.trim();
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
  }
}
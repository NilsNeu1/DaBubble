import { Component, HostBinding, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
})
export class EmojiPicker {
  emojis = input.required<string[]>();
  align = input<'left' | 'right'>('left');
  emojiSelected = output<string>();

  @HostBinding('class.align-right')
  get isAlignedRight(): boolean {
    return this.align() === 'right';
  }

  onEmojiClick(event: MouseEvent, emoji: string): void {
    event.stopPropagation();
    this.emojiSelected.emit(emoji);
  }
}
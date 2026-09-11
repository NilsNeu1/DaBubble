import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  HostBinding,
  input,
  output,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import 'emoji-picker-element';

interface EmojiClickDetail {
  unicode: string;
}

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class EmojiPicker implements AfterViewInit, OnDestroy {
  align = input<'left' | 'right'>('left');
  direction = input<'up' | 'down'>('up');
  emojiSelected = output<string>();

  @ViewChild('picker', { static: true }) pickerRef!: ElementRef<HTMLElement>;

  @HostBinding('class.align-right')
  get isAlignedRight(): boolean {
    return this.align() === 'right';
  }

  @HostBinding('class.direction-down')
  get isDirectionDown(): boolean {
    return this.direction() === 'down';
  }

  private readonly handleEmojiClick = (event: Event): void => {
    const detail = (event as CustomEvent<EmojiClickDetail>).detail;
    this.emojiSelected.emit(detail.unicode);
  };

  ngAfterViewInit(): void {
    this.pickerRef.nativeElement.addEventListener('emoji-click', this.handleEmojiClick);
  }

  ngOnDestroy(): void {
    this.pickerRef.nativeElement.removeEventListener('emoji-click', this.handleEmojiClick);
  }
}


// import { Component, HostBinding, input, output } from '@angular/core';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-emoji-picker',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './emoji-picker.html',
//   styleUrl: './emoji-picker.scss',
// })
// export class EmojiPicker {
//   emojis = input.required<string[]>();
//   align = input<'left' | 'right'>('left');
//   direction = input<'up' | 'down'>('up');
//   emojiSelected = output<string>();

//   @HostBinding('class.align-right')
//   get isAlignedRight(): boolean {
//     return this.align() === 'right';
//   }

//     @HostBinding('class.direction-down')
//   get isDirectionDown(): boolean {
//     return this.direction() === 'down';
//   }

//   onEmojiClick(event: MouseEvent, emoji: string): void {
//     event.stopPropagation();
//     this.emojiSelected.emit(emoji);
//   }
// }
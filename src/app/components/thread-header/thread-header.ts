import { Component, input, output } from '@angular/core';

type ThreadConversationType = 'channel' | 'direct-message';

@Component({
    selector: 'app-thread-header',
    imports: [],
    templateUrl: './thread-header.html',
    styleUrl: './thread-header.scss',
})
export class ThreadHeader {
    /** Receives the conversation type of the active thread. */
    public readonly conversationType =
        input<ThreadConversationType>('channel');

    /** Receives the conversation label of the active thread. */
    public readonly conversationLabel = input('Entwicklerteam');

    /** Emits when the thread should close. */
    public readonly closeRequested = output<void>();

    /** Requests closing the active thread. */
    protected requestClose(): void {
        this.closeRequested.emit();
    }
}
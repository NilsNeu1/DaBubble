import {
    AfterViewInit,
    Component,
    ElementRef,
    Input,
    output,
    signal,
    ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreadHeader } from '../thread-header/thread-header';
import { ChatMessage } from '../../core/models/message.model';

interface ThreadReactionUser {
    id: string;
    name: string;
    isCurrentUser?: boolean;
}

interface ThreadReaction {
    icon: string;
    reactedBy: ThreadReactionUser[];
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
export class ThreadPanel implements AfterViewInit {

    @ViewChild('threadMessages')
    private threadMessages?: ElementRef<HTMLDivElement>;

    public readonly closeRequested = output<void>();

    public readonly userProfileRequested = output<string>();

    protected readonly openEditMenuId = signal<string | null>(null);

    private editMenuCloseTimeout?: ReturnType<typeof setTimeout>;

    @Input({ required: true }) parentMessage!: ChatMessage;

    // TEMP-THREAD-PREVIEW: Provides the selected parent message until real message data is connected.
    // protected readonly parentMessage: ThreadMessage = {
    //     id: 'temp-thread-parent',
    //     senderId: 'temp-user-erika',
    //     senderName: 'Erika Mustermann',
    //     senderImageUrl: '/assets/01.Charaters.png',
    //     timestamp: '14:25 Uhr',
    //     text: 'styling test',
    //     reactions: [],
    //     isOwnMessage: false,
    // };

    // TEMP-THREAD-PREVIEW: Provides replies until Firestore thread data is connected.
    protected readonly replies: ThreadMessage[] = [
        {
            id: 'temp-thread-reply-sofia',
            senderId: 'temp-user-sofia',
            senderName: 'Sofia Müller',
            senderImageUrl: '/assets/01.Charaters.png',
            timestamp: '14:30 Uhr',
            text: 'Ich habe die gleiche Frage. Ich habe gegoogelt und es scheint, dass die aktuelle Version Angular 13 ist.',
            reactions: [
                {
                    icon: '🤓',
                    reactedBy: [
                        {
                            id: 'temp-user-noah',
                            name: 'Noah Braun',
                        },
                        {
                            id: 'temp-user-current',
                            name: 'Header Testuser',
                            isCurrentUser: true,
                        },
                    ],
                },
            ],
            isOwnMessage: false,
        },
        {
            id: 'temp-thread-reply-current',
            senderId: 'temp-user-current',
            senderName: 'Header Testuser',
            senderImageUrl: '/assets/default-user-avatar.png',
            timestamp: '15:06 Uhr',
            text: 'Ja das ist es Ja das ist es Ja das ist es Ja das ist es Ja das ist es Ja das ist es Ja das ist es Ja das ist es Ja das ist es.',
            reactions: [
                {
                    icon: '👍',
                    reactedBy: [
                        {
                            id: 'temp-user-sofia',
                            name: 'Sofia Müller',
                        },
                        {
                            id: 'temp-user-erika',
                            name: 'Erika Mustermann',
                        },
                        {
                            id: 'temp-user-noah',
                            name: 'Noah Braun',
                        },
                        {
                            id: 'temp-user-nils',
                            name: 'Nils Neumann',
                        },
                        {
                            id: 'temp-user-current',
                            name: 'Header Testuser',
                            isCurrentUser: true,
                        },
                        {
                            id: 'temp-user-fernando',
                            name: 'Fernando Cun Ramírez',
                        },
                    ],
                },
            ],
            isOwnMessage: true,
        },
    ];

    /** Removes empty contenteditable markup so the placeholder becomes visible again. */
    protected handleEditorInput(event: Event): void {
        const editor = event.currentTarget as HTMLElement;

        if (!editor.textContent?.trim()) {
            editor.innerHTML = '';
        }
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
}
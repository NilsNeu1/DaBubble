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
import { ChatMessage, Reaction, ReactionUser } from '../../core/models/message.model';
import { ThreadRepliesService } from '../../core/services/thread-replies';
import { ThreadReply } from '../../core/models/reply.model';
import { Auth } from '../../core/services/auth';
import { OnInit, OnDestroy } from '@angular/core';
import { inject } from '@angular/core';


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

    private editMenuCloseTimeout?: ReturnType<typeof setTimeout>;

    @Input({ required: true }) parentMessage!: ChatMessage;
    @Input({ required: true }) channelId!: string;

    private readonly repliesService = inject(ThreadRepliesService);
    private readonly authService = inject(Auth);


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
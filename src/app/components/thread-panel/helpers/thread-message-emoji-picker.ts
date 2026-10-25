import { signal } from '@angular/core';

export type ThreadEmojiTarget = 'input' | 'parent-reaction' | 'reply-reaction' | 'edit';

export class ThreadMessageEmojiPicker {
    readonly isOpen = signal(false);
    readonly target = signal<ThreadEmojiTarget>('input');
    readonly reactionReplyId = signal<string | null>(null);
    private switchTimeout?: ReturnType<typeof setTimeout>;

    /** Switches the shared picker between the input, reactions and editing. */
    switch(target: ThreadEmojiTarget, replyId: string | null = null): void {
        const isSameTarget = this.isOpen() && this.target() === target && this.reactionReplyId() === replyId;
        this.cancelPendingSwitch();
        if (isSameTarget) {
            this.isOpen.set(false);
            return;
        }
        const wasOpen = this.isOpen();
        this.isOpen.set(false);
        this.target.set(target);
        this.reactionReplyId.set(replyId);
        if (!wasOpen) {
            this.isOpen.set(true);
            return;
        }
        this.scheduleOpen();
    }

    /** Opens the new picker after its previous target closes. */
    private scheduleOpen(): void {
        this.switchTimeout = setTimeout(() => {
            this.isOpen.set(true);
            this.switchTimeout = undefined;
        }, 120);
    }

    /** Cancels any pending picker opening. */
    private cancelPendingSwitch(): void {
        if (!this.switchTimeout) return;
        clearTimeout(this.switchTimeout);
        this.switchTimeout = undefined;
    }

    /** Clears a pending picker switch before the thread closes. */
    destroy(): void {
        this.cancelPendingSwitch();
    }
}

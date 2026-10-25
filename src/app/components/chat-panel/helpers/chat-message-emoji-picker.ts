
import { signal } from '@angular/core';

type EmojiTarget = 'input' | 'reaction' | 'edit';

export class ChatMessageEmojiPicker {
    readonly isOpen = signal(false);
    readonly target = signal<EmojiTarget>('input');
    readonly reactionMessageId = signal<string | null>(null);
    private switchTimeout?: ReturnType<typeof setTimeout>;

    /** Initializes the picker with a callback for closing mentions. */
    constructor(private readonly closeMentions: () => void) { }

    /** Switches the shared emoji picker to another target. */
    switch(target: EmojiTarget, messageId: string | null = null): void {
        const isSame = this.isSameTarget(target, messageId);
        this.clearSwitchTimeout();
        if (isSame) {
            this.isOpen.set(false);
            return;
        }
        const wasOpen = this.isOpen();
        this.prepareTarget(target, messageId);
        if (wasOpen) this.openAfterDelay();
        else this.isOpen.set(true);
    }

    /** Checks whether the requested target is already open. */
    private isSameTarget(target: EmojiTarget, messageId: string | null): boolean {
        return this.isOpen() &&
            this.target() === target &&
            this.reactionMessageId() === messageId;
    }

    /** Prepares the selected target and closes mention suggestions. */
    private prepareTarget(target: EmojiTarget, messageId: string | null): void {
        this.isOpen.set(false);
        this.target.set(target);
        this.reactionMessageId.set(messageId);
        this.closeMentions();
    }

    /** Opens the picker after switching its target. */
    private openAfterDelay(): void {
        this.switchTimeout = setTimeout(() => {
            this.isOpen.set(true);
            this.switchTimeout = undefined;
        }, 120);
    }

    /** Cancels a pending emoji picker switch. */
    private clearSwitchTimeout(): void {
        if (!this.switchTimeout) return;
        clearTimeout(this.switchTimeout);
        this.switchTimeout = undefined;
    }

    /** Cleans up the pending switch when the component is destroyed. */
    destroy(): void {
        this.clearSwitchTimeout();
    }
}

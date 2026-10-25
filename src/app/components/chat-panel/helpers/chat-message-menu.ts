import { signal } from '@angular/core';

export class ChatMessageMenu {
    readonly activeId = signal<string | null>(null);
    readonly pendingDeleteId = signal<string | null>(null);
    private closeTimeout?: ReturnType<typeof setTimeout>;

    /** Toggles the message menu and resets its delete confirmation. */
    toggle(messageId: string): void {
        this.cancelClose();
        const isSameMenu = this.activeId() === messageId;
        this.activeId.set(isSameMenu ? null : messageId);
        this.pendingDeleteId.set(null);
    }

    /** Checks whether the selected message menu is open. */
    isOpen(messageId: string): boolean {
        return this.activeId() === messageId;
    }

    /** Closes the message menu and its delete confirmation. */
    close(): void {
        this.cancelClose();
        this.activeId.set(null);
        this.pendingDeleteId.set(null);
    }

    /** Schedules the message menu to close after hovering ends. */
    scheduleClose(): void {
        this.cancelClose();
        this.closeTimeout = setTimeout(() => {
            this.closeTimeout = undefined;
            this.close();
        }, 150);
    }

    /** Cancels a pending message menu close. */
    cancelClose(): void {
        if (!this.closeTimeout) return;
        clearTimeout(this.closeTimeout);
        this.closeTimeout = undefined;
    }

    /** Opens the delete confirmation for a message. */
    requestDelete(messageId: string): void {
        this.pendingDeleteId.set(messageId);
    }

    /** Cancels the current delete confirmation. */
    cancelDelete(): void {
        this.pendingDeleteId.set(null);
    }

    /** Checks whether a message has an open delete confirmation. */
    isDeleteOpen(messageId: string): boolean {
        return this.pendingDeleteId() === messageId;
    }

    /** Closes the menu when hovering over another message. */
    closeForOtherMessage(messageId: string): void {
        const openMenuId = this.activeId();
        if (openMenuId !== null && openMenuId !== messageId) this.close();
    }
}
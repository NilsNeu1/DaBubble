export class ThreadMessageScroll {
    private lastVisibleMessageKey = '';

    /** Initializes scrolling with access to the thread message container. */
    constructor(private readonly getContainer: () => HTMLDivElement | undefined) { }

    /** Scrolls when the latest visible thread reply changes. */
    handleReplies(channelId: string, parentId: string, lastReplyId?: string): void {
        const key = `${channelId}:${parentId}:${lastReplyId ?? 'parent'}`;
        if (key === this.lastVisibleMessageKey) return;
        this.lastVisibleMessageKey = key;
        this.scheduleBottomScroll();
    }

    /** Schedules scrolling after the thread view has rendered. */
    scheduleBottomScroll(): void {
        requestAnimationFrame(() => this.scrollToBottom());
    }

    /** Scrolls the thread message container to its bottom position. */
    private scrollToBottom(): void {
        const container = this.getContainer();
        if (!container) return;
        container.scrollTop = container.scrollHeight;
    }
}
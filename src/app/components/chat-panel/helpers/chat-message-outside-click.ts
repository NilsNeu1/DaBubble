
/** Checks whether a click occurred outside the emoji picker and its triggers. */
export function isOutsideEmojiPicker(event: MouseEvent, picker?: HTMLElement): boolean {
    const target = event.target;
    if (!(target instanceof Node)) return false;
    const element = target instanceof Element ? target : null;
    return !picker?.contains(target) && !element?.closest('.emoji-picker-trigger');
}

/** Checks whether a click occurred outside the mention picker and its trigger. */
export function isOutsideMentionPicker(event: MouseEvent, picker?: HTMLElement, trigger?: HTMLElement): boolean {
    const target = event.target;
    if (!(target instanceof Node)) return false;
    return !picker?.contains(target) && !trigger?.contains(target);
}

/** Checks whether a click should cancel the active message edit. */
export function isOutsideMessageEditor(event: MouseEvent, editingEmoji: boolean, picker?: HTMLElement): boolean {
    const target = event.target;
    if (!(target instanceof Node)) return false;
    if (target instanceof Element && target.closest('.msg-edit-box')) return false;
    return !(editingEmoji && picker?.contains(target));
}

/** Checks whether a click occurred outside the message options menu. */
export function isOutsideMessageMenu(event: MouseEvent): boolean {
    return !(event.target instanceof Element &&
        event.target.closest('.msg-options-trigger'));
}

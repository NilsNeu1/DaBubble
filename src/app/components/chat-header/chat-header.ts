import {
  Component, computed, effect, ElementRef, HostListener,
  inject, input, output, signal, ViewChild
} from '@angular/core';
import { ChannelMembersDropdown } from '../channel-members-dropdown/channel-members-dropdown';
import { ChannelAddMembersDropdown } from '../channel-add-members-dropdown/channel-add-members-dropdown';
import { ChatModel } from '../../core/chat.model';
import { Auth } from '../../core/services/auth';
import { ChatHeaderNewMessage } from './helpers/chat-header-new-message';
import type { NewMessageRecipient, NewMessageSearchSuggestion } from './helpers/chat-header-new-message';
export type { NewMessageRecipient } from './helpers/chat-header-new-message';

type ChatHeaderStatus = 'online' | 'offline';
type ChatHeaderPreviewType = 'channel' | 'direct-message' | 'new-message';

interface ChatHeaderMember {
  uid: string;
  name: string;
  avatarUrl: string;
  status: ChatHeaderStatus;
}

interface ChannelHeaderData {
  type: 'channel';
  id: string;
  name: string;
  members: ChatHeaderMember[];
}

interface DirectMessageHeaderData {
  type: 'direct-message';
  id: string;
  partnerId: string;
  name: string;
  avatarUrl: string;
  status: ChatHeaderStatus;
  isCurrentUser: boolean;
}

type ChatHeaderData = ChannelHeaderData | DirectMessageHeaderData;

@Component({
  selector: 'app-chat-header',
  imports: [ChannelMembersDropdown, ChannelAddMembersDropdown],
  templateUrl: './chat-header.html',
  styleUrl: './chat-header.scss'
})
export class ChatHeader {
  private readonly auth = inject(Auth);
  private readonly chatModel = inject(ChatModel);

  readonly chat = input<ChatHeaderData | null>(null);
  readonly previewType = input<ChatHeaderPreviewType>('channel');
  readonly channelDetailsOpen = input(false);
  readonly channelDetailsRequested = output<string>();
  readonly membersRequested = output<string>();
  readonly userProfileRequested = output<string>();
  readonly newMessageRecipientSelected = output<NewMessageRecipient>();
  readonly newMessageRecipientCleared = output<void>();

  @ViewChild('newMessageSearchResults') private newMessageSearchResults?: ElementRef<HTMLDivElement>;
  @ViewChild('newMessageInput') private newMessageInput?: ElementRef<HTMLInputElement>;

  private readonly newMessage = new ChatHeaderNewMessage(
    this.auth, this.chatModel, () => this.newMessageSearchResults?.nativeElement
  );
  protected readonly newMessageSearchTerm = this.newMessage.searchTerm;
  protected readonly selectedNewMessageIndex = this.newMessage.selectedIndex;
  protected readonly isNewMessageSearchFocused = this.newMessage.isFocused;
  protected readonly selectedNewMessageSuggestion = this.newMessage.selectedSuggestion;
  protected readonly newMessageSearchSuggestions = this.newMessage.suggestions;
  protected readonly isNewMessageSuggestionListOpen = this.newMessage.isSuggestionListOpen;
  protected newMessagePlaceholder = this.newMessage.getPlaceholder();
  protected readonly isMembersDropdownOpen = signal(false);
  protected readonly isAddMembersDropdownOpen = signal(false);
  protected readonly activeChat = computed(() => this.getActiveChat());
  private readonly resetNewMessageEffect = effect(() => {
    if (this.previewType() !== 'new-message') this.newMessage.reset();
  });

  /** Focuses the new-message recipient search input. */
  public focusNewMessageInput(): void {
    this.newMessageInput?.nativeElement.focus();
  }

  /** Requests details for the active channel. */
  protected requestChannelDetails(): void {
    const chat = this.activeChat();
    if (chat?.type === 'channel') this.channelDetailsRequested.emit(chat.id);
  }

  /** Opens the active channel's member overview. */
  protected requestMembers(): void {
    if (this.activeChat()?.type !== 'channel') return;
    this.isAddMembersDropdownOpen.set(false);
    this.isMembersDropdownOpen.set(true);
  }

  /** Opens the add-member dropdown or responsive member overview. */
  protected requestAddMember(): void {
    if (this.activeChat()?.type !== 'channel') return;
    if (window.innerWidth <= 1024) return this.requestMembers();
    this.openAddMembersDropdown();
  }

  /** Closes the channel member overview. */
  protected closeMembersDropdown(): void {
    this.isMembersDropdownOpen.set(false);
  }

  /** Opens a member profile from the dropdown. */
  protected openMemberProfile(userId: string): void {
    this.closeMembersDropdown();
    this.requestUserProfile(userId);
  }

  /** Opens the add-member dropdown from the member overview. */
  protected requestAddMemberFromDropdown(): void {
    this.openAddMembersDropdown();
  }

  /** Closes the channel add-member dropdown. */
  protected closeAddMembersDropdown(): void {
    this.isAddMembersDropdownOpen.set(false);
  }

  /** Requests a user's profile from the parent component. */
  protected requestUserProfile(userId: string): void {
    this.userProfileRequested.emit(userId);
  }

  /** Closes channel dropdowns after a click outside their controls. */
  @HostListener('document:click', ['$event'])
  protected closeChannelDropdownsOnOutsideClick(event: MouseEvent): void {
    if (!this.isMembersDropdownOpen() && !this.isAddMembersDropdownOpen()) return;
    const target = event.target;
    if (!(target instanceof Element) || this.isChannelDropdownClick(target)) return;
    this.isMembersDropdownOpen.set(false);
    this.isAddMembersDropdownOpen.set(false);
  }

  /** Checks whether the click belongs to a channel dropdown or trigger. */
  private isChannelDropdownClick(target: Element): boolean {
    return !!target.closest('app-channel-members-dropdown, app-channel-add-members-dropdown, ' +
      '.chat-header__members-button, .chat-header__add-member-button');
  }

  /** Refreshes the responsive new-message placeholder. */
  @HostListener('window:resize')
  protected updateNewMessagePlaceholder(): void {
    this.newMessagePlaceholder = this.newMessage.getPlaceholder();
  }

  /** Updates the new-message recipient search value. */
  protected updateNewMessageSearch(event: Event): void {
    this.newMessage.updateSearch((event.target as HTMLInputElement).value);
  }

  /** Handles keyboard navigation through recipient suggestions. */
  protected onNewMessageSearchKeydown(event: KeyboardEvent): void {
    this.newMessage.handleKeydown(event, (item) => this.selectNewMessageRecipient(item));
  }

  /** Selects the recipient and notifies the messenger. */
  protected selectNewMessageRecipient(suggestion: NewMessageSearchSuggestion): void {
    this.newMessageRecipientSelected.emit(this.newMessage.selectRecipient(suggestion));
  }

  /** Opens the add-member dropdown without the member overview. */
  private openAddMembersDropdown(): void {
    this.isMembersDropdownOpen.set(false);
    this.isAddMembersDropdownOpen.set(true);
  }

  /** Clears the selected new-message recipient. */
  protected clearNewMessageRecipient(): void {
    this.newMessage.clearRecipient();
    this.newMessageRecipientCleared.emit();
  }

  /** Returns the active chat with refreshed member information. */
  private getActiveChat(): ChatHeaderData | null {
    const chat = this.chat();
    if (!chat) return null;
    return chat.type === 'direct-message'
      ? this.getDirectMessageHeaderData(chat) : this.getChannelHeaderData(chat);
  }

  /** Refreshes a direct-message header from live user data. */
  private getDirectMessageHeaderData(chat: DirectMessageHeaderData): DirectMessageHeaderData {
    const user = this.auth.allUsers().find(({ uid }) => uid === chat.partnerId);
    if (!user) return chat;
    return {
      ...chat, name: user.name, avatarUrl: user.avatarUrl, status: user.status,
      isCurrentUser: user.uid === this.auth.currentUser()?.uid
    };
  }

  /** Refreshes channel member details from live user data. */
  private getChannelHeaderData(chat: ChannelHeaderData): ChannelHeaderData {
    return { ...chat, members: chat.members.map((member) => this.getChannelMemberData(member)) };
  }

  /** Refreshes a member's name, avatar and presence state. */
  private getChannelMemberData(member: ChatHeaderMember): ChatHeaderMember {
    const user = this.auth.allUsers().find(({ uid }) => uid === member.uid);
    if (!user) return member;
    return { ...member, name: user.name, avatarUrl: user.avatarUrl, status: user.status };
  }
}

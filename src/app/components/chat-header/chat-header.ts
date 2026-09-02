import {
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ChannelMembersDropdown
} from '../channel-members-dropdown/channel-members-dropdown';
import {
  ChannelAddMembersDropdown,
} from '../channel-add-members-dropdown/channel-add-members-dropdown';
import {
  ChatModel
} from '../../core/chat.model';
import type {
  AppUser
} from '../../core/models/user.model';
import {
  Auth
} from '../../core/services/auth';

type ChatHeaderStatus = 'online' | 'offline';
type ChatHeaderPreviewType = 'channel' | 'direct-message' | 'new-message';

interface ChatHeaderMember {
  uid: string;
  name: string;
  avatarUrl: string;
  status: ChatHeaderStatus;
}

interface NewMessageSearchSuggestion {
  id: string;
  type: 'user' | 'channel';
  label: string;
  email?: string;
  avatarUrl?: string;
  status?: ChatHeaderStatus;
}

export interface NewMessageRecipient {
  id: string;
  type: 'user' | 'channel';
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
  styleUrl: './chat-header.scss',
})
export class ChatHeader {
  private readonly auth = inject(Auth);
  private readonly chatModel = inject(ChatModel);

  /** Receives the currently active chat. */
  public readonly chat = input<ChatHeaderData | null>(null);

  /** Selects the current chat header state. */
  public readonly previewType = input<ChatHeaderPreviewType>('channel');

  /** Receives whether the channel details are open. */
  public readonly channelDetailsOpen = input(false);

  /** Emits when channel details should open. */
  public readonly channelDetailsRequested = output<string>();

  /** Emits when the member overview should open. */
  public readonly membersRequested = output<string>();

  /** Emits when a user profile should open. */
  public readonly userProfileRequested = output<string>();

  /** Emits when a new message recipient is selected. */
  public readonly newMessageRecipientSelected = output<NewMessageRecipient>();

  /** Stores the current new message search value. */
  protected readonly newMessageSearchTerm = signal('');

  /** Stores the selected suggestion for a new message. */
  protected readonly selectedNewMessageSuggestion = signal<NewMessageSearchSuggestion | null>(null);

  /** Stores whether the channel member dropdown is open. */
  protected readonly isMembersDropdownOpen = signal(false);

  /** Stores whether the add-member dropdown is open. */
  protected readonly isAddMembersDropdownOpen = signal(false);

  /** Stores the responsive placeholder for the new message search. */
  protected newMessagePlaceholder = this.getNewMessagePlaceholder();

  /** Returns matching new message suggestions. */
  protected readonly newMessageSearchSuggestions = computed(() => {
    if (this.selectedNewMessageSuggestion()) return [];
    const term = this.newMessageSearchTerm().trim();
    return term ? this.getNewMessageSearchSuggestions(term) : [];
  });

  /** Indicates whether new message suggestions are available. */
  protected readonly isNewMessageSuggestionListOpen = computed(
    () => this.newMessageSearchSuggestions().length > 0
  );

  /** Provides the currently selected chat with up-to-date user data. */
  protected readonly activeChat = computed(() => this.getActiveChat());

  /** Resets the compose state when leaving the new message view. */
  private readonly resetNewMessageEffect = effect(() => {
    if (this.previewType() === 'new-message') return;
    this.resetNewMessageState();
  });

  /** Requests the active channel details. */
  protected requestChannelDetails(): void {
    const chat = this.activeChat();
    if (!chat || chat.type !== 'channel') return;
    this.channelDetailsRequested.emit(chat.id);
  }

  /** Opens the member overview of the active channel. */
  protected requestMembers(): void {
    const chat = this.activeChat();
    if (!chat || chat.type !== 'channel') return;
    this.isAddMembersDropdownOpen.set(false);
    this.isMembersDropdownOpen.set(true);
  }

  /** Opens the responsive add-member view. */
  protected requestAddMember(): void {
    const chat = this.activeChat();
    if (!chat || chat.type !== 'channel') return;
    if (window.innerWidth <= 1024) return this.requestMembers();
    this.openAddMembersDropdown();
  }

  /** Closes the channel member dropdown. */
  protected closeMembersDropdown(): void {
    this.isMembersDropdownOpen.set(false);
  }

  /** Opens the selected member profile. */
  protected openMemberProfile(userId: string): void {
    this.closeMembersDropdown();
    this.requestUserProfile(userId);
  }

  /** Opens the add-member dropdown from the member overview. */
  protected requestAddMemberFromDropdown(): void {
    this.openAddMembersDropdown();
  }

  /** Closes the add-member dropdown. */
  protected closeAddMembersDropdown(): void {
    this.isAddMembersDropdownOpen.set(false);
  }

  /** Requests the selected user's profile. */
  protected requestUserProfile(userId: string): void {
    this.userProfileRequested.emit(userId);
  }

  /** Updates the new message placeholder on viewport changes. */
  @HostListener('window:resize')
  protected updateNewMessagePlaceholder(): void {
    this.newMessagePlaceholder = this.getNewMessagePlaceholder();
  }

  /** Updates the new message search value. */
  protected updateNewMessageSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedNewMessageSuggestion.set(null);
    this.newMessageSearchTerm.set(input.value);
  }

  /** Selects a recipient for the new message. */
  protected selectNewMessageRecipient(
    suggestion: NewMessageSearchSuggestion
  ): void {
    const recipient = this.createNewMessageRecipient(suggestion);
    this.selectedNewMessageSuggestion.set(suggestion);
    this.newMessageSearchTerm.set('');
    this.newMessageRecipientSelected.emit(recipient);
  }

  /** Opens only the add-member dropdown. */
  private openAddMembersDropdown(): void {
    this.isMembersDropdownOpen.set(false);
    this.isAddMembersDropdownOpen.set(true);
  }

  /** Clears the current new message compose state. */
  private resetNewMessageState(): void {
    this.newMessageSearchTerm.set('');
    this.selectedNewMessageSuggestion.set(null);
  }

  /** Clears the selected new message recipient. */
  protected clearNewMessageRecipient(): void {
    this.selectedNewMessageSuggestion.set(null);
    this.newMessageSearchTerm.set('');
  }

  /** Returns the responsive new message placeholder. */
  private getNewMessagePlaceholder(): string {
    return window.innerWidth <= 1024
      ? 'An: #channel, oder @jemand'
      : 'An: #channel, oder @jemand oder E-Mail Adresse';
  }

  /** Returns the currently selected chat with refreshed user data. */
  private getActiveChat(): ChatHeaderData | null {
    const chat = this.chat();
    if (!chat) return null;
    return chat.type === 'direct-message'
      ? this.getDirectMessageHeaderData(chat)
      : this.getChannelHeaderData(chat);
  }

  /** Refreshes direct-message header data from the current user list. */
  private getDirectMessageHeaderData(chat: DirectMessageHeaderData): DirectMessageHeaderData {
    const user = this.auth.allUsers().find(({ uid }) => uid === chat.id);
    if (!user) return chat;
    return {
      ...chat,
      name: user.name,
      avatarUrl: user.avatarUrl,
      status: user.status,
      isCurrentUser: user.uid === this.auth.currentUser()?.uid,
    };
  }

  /** Refreshes channel member data from the current user list. */
  private getChannelHeaderData(chat: ChannelHeaderData): ChannelHeaderData {
    return {
      ...chat,
      members: chat.members.map((member) => this.getChannelMemberData(member)),
    };
  }

  /** Refreshes one channel member from the current user list. */
  private getChannelMemberData(member: ChatHeaderMember): ChatHeaderMember {
    const user = this.auth.allUsers().find(({ uid }) => uid === member.uid);
    if (!user) return member;
    return {
      ...member,
      name: user.name,
      avatarUrl: user.avatarUrl,
      status: user.status,
    };
  }

  /** Creates the recipient payload for the parent component. */
  private createNewMessageRecipient(
    suggestion: NewMessageSearchSuggestion
  ): NewMessageRecipient {
    return {
      id: suggestion.id,
      type: suggestion.type,
    };
  }

  /** Selects the correct suggestions for the entered value. */
  private getNewMessageSearchSuggestions(term: string): NewMessageSearchSuggestion[] {
    const prefix = term.charAt(0);
    if (prefix === '#') return this.filterNewMessageChannels(term.slice(1));
    if (prefix === '@') return this.filterNewMessageUsers(term.slice(1));

    return this.filterNewMessageUsers(term);
  }

  /** Filters available users by name or email. */
  private filterNewMessageUsers(query: string): NewMessageSearchSuggestion[] {
    const normalizedQuery = query.trim().toLowerCase();
    return this.auth
      .allUsers()
      .filter((user) => this.matchesNewMessageUser(user, normalizedQuery))
      .map((user) => this.mapUserToSearchSuggestion(user));
  }

  /** Checks whether a user matches the current search query. */
  private matchesNewMessageUser(user: AppUser, query: string): boolean {
    return `${user.name} ${user.email}`.toLowerCase().includes(query);
  }

  /** Maps a user to a new-message search suggestion. */
  private mapUserToSearchSuggestion(user: AppUser): NewMessageSearchSuggestion {
    return {
      id: user.uid,
      type: 'user',
      label: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      status: user.status,
    };
  }

  /** Filters available channels by name. */
  private filterNewMessageChannels(query: string): NewMessageSearchSuggestion[] {
    const normalizedQuery = query.trim().toLowerCase();
    return this.chatModel
      .channels()
      .filter(({ channelName }) => this.matchesNewMessageChannel(channelName, normalizedQuery))
      .map(({ channelId, channelName }) =>
        this.mapChannelToSearchSuggestion(channelId, channelName)
      );
  }

  /** Checks whether a channel matches the current search query. */
  private matchesNewMessageChannel(channelName: string, query: string): boolean {
    return channelName.toLowerCase().includes(query);
  }

  /** Maps a channel to a new-message search suggestion. */
  private mapChannelToSearchSuggestion(
    channelId: string,
    channelName: string
  ): NewMessageSearchSuggestion {
    return {
      id: channelId,
      type: 'channel',
      label: channelName,
    };
  }
}
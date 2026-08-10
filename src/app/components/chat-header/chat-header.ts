import {
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

type ChatHeaderStatus = 'online' | 'offline';
type ChatHeaderPreviewType = 'channel' | 'direct-message' | 'new-message';

interface ChatHeaderMember {
  id: string;
  name: string;
  avatarUrl: string;
}

interface NewMessageSearchSuggestion {
  id: string;
  type: 'user' | 'channel';
  label: string;
  email?: string;
  avatarUrl?: string;
  status?: ChatHeaderStatus;
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

type ChatHeaderData =
  | ChannelHeaderData
  | DirectMessageHeaderData;

const TEMP_CHANNEL: ChannelHeaderData = {
  type: 'channel',
  id: 'temp-developer-team',
  name: 'Entwicklerteam',
  members: [
    {
      id: 'temp-user-current',
      name: 'Header Testuser (Du)',
      avatarUrl: 'assets/default-user-avatar.png',
    },
    {
      id: 'temp-user-frederik',
      name: 'Frederik Beck',
      avatarUrl: 'assets/00.Charaters.png',
    },
    {
      id: 'temp-user-sofia',
      name: 'Sofia Müller',
      avatarUrl: 'assets/01.Charaters.png',
    },
    {
      id: 'temp-user-noah',
      name: 'Noah Braun',
      avatarUrl: 'assets/02.Charaters.png',
    },
    {
      id: 'temp-user-elise',
      name: 'Elise Roth',
      avatarUrl: 'assets/03.Charaters.png',
    },
    {
      id: 'temp-user-elias',
      name: 'Elias Neumann',
      avatarUrl: 'assets/04.Charaters.png',
    },
    {
      id: 'temp-user-steffen',
      name: 'Steffen Hoffmann',
      avatarUrl: 'assets/05.Charaters.png',
    },
  ],
};

const TEMP_DIRECT_MESSAGE: DirectMessageHeaderData = {
  type: 'direct-message',
  id: 'temp-user-sofia',
  name: 'Sofia Müller',
  avatarUrl: 'assets/01.Charaters.png',
  status: 'online',
  isCurrentUser: false,
};

/** TEMP-CHAT-HEADER-PREVIEW: Provides users for the new message search. */
const TEMP_NEW_MESSAGE_USERS: NewMessageSearchSuggestion[] = [
  {
    id: 'temp-user-current',
    type: 'user',
    label: 'Header Testuser (Du)',
    email: 'testuser@dabubble.de',
    avatarUrl: 'assets/default-user-avatar.png',
    status: 'online',
  },
  {
    id: 'temp-user-frederik',
    type: 'user',
    label: 'Frederik Beck',
    email: 'frederik.beck@dabubble.de',
    avatarUrl: 'assets/00.Charaters.png',
    status: 'online',
  },
  {
    id: 'temp-user-sofia',
    type: 'user',
    label: 'Sofia Müller',
    email: 'sofia.mueller@dabubble.de',
    avatarUrl: 'assets/01.Charaters.png',
    status: 'online',
  },
  {
    id: 'temp-user-noah',
    type: 'user',
    label: 'Noah Braun',
    email: 'noah.braun@dabubble.de',
    avatarUrl: 'assets/02.Charaters.png',
    status: 'offline',
  },
  {
    id: 'temp-user-elise',
    type: 'user',
    label: 'Elise Roth',
    email: 'elise.roth@dabubble.de',
    avatarUrl: 'assets/03.Charaters.png',
    status: 'online',
  },
  {
    id: 'temp-user-elias',
    type: 'user',
    label: 'Elias Neumann',
    email: 'elias.neumann@dabubble.de',
    avatarUrl: 'assets/04.Charaters.png',
    status: 'offline',
  },
  {
    id: 'temp-user-steffen',
    type: 'user',
    label: 'Steffen Hoffmann',
    email: 'steffen.hoffmann@dabubble.de',
    avatarUrl: 'assets/05.Charaters.png',
    status: 'online',
  },
];

/** TEMP-CHAT-HEADER-PREVIEW: Provides channels for the new message search. */
const TEMP_NEW_MESSAGE_CHANNELS: NewMessageSearchSuggestion[] = [
  {
    id: 'temp-channel-1',
    type: 'channel',
    label: 'Allgemein',
  },
  {
    id: 'temp-channel-2',
    type: 'channel',
    label: 'Entwicklerteam',
  },
  {
    id: 'temp-channel-3',
    type: 'channel',
    label: 'Office-team',
  },
];

@Component({
  selector: 'app-chat-header',
  imports: [],
  templateUrl: './chat-header.html',
  styleUrl: './chat-header.scss',
})
export class ChatHeader {
  /** Receives the currently active chat later. */
  public readonly chat = input<ChatHeaderData | null>(null);

  /** TEMP-CHAT-HEADER-PREVIEW: Selects the preview state. */
  public readonly previewType =
    input<ChatHeaderPreviewType>('channel');

  /** Emits when channel details should open. */
  public readonly channelDetailsRequested = output<string>();

  /** Emits when the member overview should open. */
  public readonly membersRequested = output<string>();

  /** Emits when the add-member dialog should open. */
  public readonly addMemberRequested = output<string>();

  /** Emits when a user profile should open. */
  public readonly userProfileRequested = output<string>();

  /** Stores the current new message search value. */
  protected readonly newMessageSearchTerm = signal('');

  /** Returns matching temporary new message suggestions. */
  protected readonly newMessageSearchSuggestions = computed(() => {
    const term = this.newMessageSearchTerm().trim();

    if (!term) return [];

    return this.getNewMessageSearchSuggestions(term);
  });

  /** Indicates whether new message suggestions are available. */
  protected readonly isNewMessageSuggestionListOpen = computed(
    () => this.newMessageSearchSuggestions().length > 0
  );

  /** Receives whether the channel details are open. */
  public readonly channelDetailsOpen = input(false);

  /** TEMP-CHAT-HEADER-PREVIEW: Provides fallback preview data. */
  protected readonly activeChat = computed<ChatHeaderData>(() => {
    if (this.chat()) return this.chat()!;

    return this.previewType() === 'direct-message'
      ? TEMP_DIRECT_MESSAGE
      : TEMP_CHANNEL;
  });

  /** Requests the active channel details. */
  protected requestChannelDetails(): void {
    const chat = this.activeChat();

    if (chat.type !== 'channel') return;

    this.channelDetailsRequested.emit(chat.id);
  }

  /** Requests the member overview of the active channel. */
  protected requestMembers(): void {
    const chat = this.activeChat();

    if (chat.type === 'channel') {
      this.membersRequested.emit(chat.id);
    }
  }

  /** Requests adding members to the active channel. */
  protected requestAddMember(): void {
    const chat = this.activeChat();

    if (chat.type === 'channel') {
      this.addMemberRequested.emit(chat.id);
    }
  }

  /** Requests the selected user's profile. */
  protected requestUserProfile(userId: string): void {
    this.userProfileRequested.emit(userId);
  }

  /** Updates the new message search value. */
  protected updateNewMessageSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newMessageSearchTerm.set(input.value);
  }

  /** Selects the correct suggestions for the entered value. */
  private getNewMessageSearchSuggestions(
    term: string
  ): NewMessageSearchSuggestion[] {
    const prefix = term.charAt(0);

    if (prefix === '#') return this.filterNewMessageChannels(term.slice(1));
    if (prefix === '@') return this.filterNewMessageUsers(term.slice(1));

    return this.filterNewMessageUsers(term);
  }

  /** Filters temporary users by name or email. */
  private filterNewMessageUsers(
    query: string
  ): NewMessageSearchSuggestion[] {
    const normalizedQuery = query.trim().toLowerCase();

    return TEMP_NEW_MESSAGE_USERS.filter((user) =>
      `${user.label} ${user.email ?? ''}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }

  /** Filters temporary channels by name. */
  private filterNewMessageChannels(
    query: string
  ): NewMessageSearchSuggestion[] {
    const normalizedQuery = query.trim().toLowerCase();

    return TEMP_NEW_MESSAGE_CHANNELS.filter(({ label }) =>
      label.toLowerCase().includes(normalizedQuery)
    );
  }
}
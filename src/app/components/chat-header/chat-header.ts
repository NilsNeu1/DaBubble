import {
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

type ChatHeaderStatus = 'online' | 'offline';
type ChatHeaderPreviewType = 'channel' | 'direct-message';

interface ChatHeaderMember {
  id: string;
  name: string;
  avatarUrl: string;
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

  /** Tracks whether the channel details are open. */
  protected readonly isChannelDetailsOpen = signal(false);

  /** TEMP-CHAT-HEADER-PREVIEW: Provides fallback preview data. */
  protected readonly activeChat = computed<ChatHeaderData>(() => {
    if (this.chat()) return this.chat()!;

    return this.previewType() === 'channel'
      ? TEMP_CHANNEL
      : TEMP_DIRECT_MESSAGE;
  });

  /** Toggles and requests the active channel details. */
  protected requestChannelDetails(): void {
    const chat = this.activeChat();

    if (chat.type !== 'channel') return;

    this.isChannelDetailsOpen.update((isOpen) => !isOpen);
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
}
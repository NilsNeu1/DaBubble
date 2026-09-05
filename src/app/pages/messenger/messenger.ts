import { Component, inject, signal } from '@angular/core';
import { Header } from '../../components/header/header';
import { ChatHeader } from '../../components/chat-header/chat-header';
import { UserProfileDialog } from '../../components/user-profile-dialog/user-profile-dialog';
import { WorkspaceMenu } from '../../components/workspace-menu/workspace-menu';
import { ChatPanel } from '../../components/chat-panel/chat-panel';
import { GroupDetailsOverlayComponent } from '../../components/group-details-overlay-component/group-details-overlay-component';
import { CommonModule } from '@angular/common';
import { Auth } from '../../core/services/auth';
import { ChatModel, getDirectMessageId } from '../../core/chat.model';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { ChatMessage } from '../../core/models/message.model';

@Component({
  selector: 'app-messenger',
  imports: [
    Header,
    ChatHeader,
    UserProfileDialog,
    WorkspaceMenu,
    ChatPanel,
    CommonModule,
    GroupDetailsOverlayComponent,
    ThreadPanel
  ],
  templateUrl: './messenger.html',
  styleUrl: './messenger.scss',
})
export class Messenger {
  isWorkspaceMenuOpen = signal(true);
  isMobileChatOpen = signal(false);
  isChannelDetailsOpen = signal(false);
  chatType = signal<'channel' | 'direct-message' | 'new-message'>('channel');
  allUsers = inject(Auth).allUsers;
  currentUser = inject(Auth).currentUser;
  selectedChat = signal<any>(null);  // ? start channel??
  activeChat = inject(ChatModel).activeChat;
  private readonly chatModel = inject(ChatModel);

  /** Opens the selected conversation. */
  async onOutputSelectedChannel(event: {
    channelName: string;
    conversationType: 'channel' | 'direct-message';
    channelId?: string;
  }): Promise<void> {
    this.chatType.set(event.conversationType);

    if (event.conversationType === 'channel') {
      await this.selectChannel(event);
    } else {
      this.selectDirectMessage(event.channelId);
    }

    this.isMobileChatOpen.set(true);
  }

  async selectChannel(event: { channelName: string; channelId?: string; }): Promise<void> {
    if (!event.channelId) return;
    const channel = await this.chatModel.getChat(event.channelId);
    if (!channel) return;

    this.selectedChat.set({
      type: 'channel',
      id: event.channelId ?? '',
      name: event.channelName,
      members: this.mapChannelMembers(channel.members ?? []),
      description: channel.description ?? '',
      createdBy: channel.createdBy ?? ''
    });
  }

  /** Maps raw Firestore channel members to the chat-header member shape. */
  private mapChannelMembers(members: unknown[]) {
    return (members as { uid: string; name: string; avatarUrl: string }[]).map(
      (member) => ({
        uid: member.uid,
        name: member.name,
        avatarUrl: member.avatarUrl,
        status: this.allUsers().find((user) => user.uid === member.uid)?.status ?? 'offline',
      })
    );
  }

  selectDirectMessage(channelId?: string): void {
    const user = this.allUsers().find(
      user => user.uid === channelId
    );

    if (!user) return;

    const currentUid = this.currentUser()?.uid;

    this.selectedChat.set({
      type: 'direct-message',
      id: currentUid ? getDirectMessageId(currentUid, user.uid) : user.uid,
      partnerId: user.uid,
      name: user.name,
      avatarUrl: user.avatarUrl,
      status: user.status,
      isCurrentUser: user.uid === currentUid
    });
  }

  /** Opens the new message view in the chat header. */
  openNewMessage(): void {
    this.chatType.set('new-message');
    this.isMobileChatOpen.set(true);
  }

  /** Returns to the mobile workspace menu. */
  showMobileWorkspaceMenu(): void {
    this.isMobileChatOpen.set(false);
  }

  /** Opens the matching profile dialog for the selected user. */
  openUserProfile(
    userId: string,
    header: Header,
    userProfileDialog: UserProfileDialog
  ): void {
    if (userId === this.currentUser()?.uid) {
      header.openProfileDialog();
      return;
    }

    userProfileDialog.openUserProfileDialog(userId);
  }

  /** Opens a channel selected from the workspace search. */
  async openChannelFromSearch(event: {
    channelId: string;
    channelName: string;
  }): Promise<void> {
    await this.chatModel.loadChat(event.channelId);
    await this.onOutputSelectedChannel({
      channelName: event.channelName,
      conversationType: 'channel',
      channelId: event.channelId,
    });
  }

  /** Opens the channel containing the selected message result. */
  async openMessageFromSearch(event: {
    channelId: string;
    messageId: string;
  }): Promise<void> {
    const channel = await this.chatModel.getChat(event.channelId);
    if (!channel) return;
    await this.chatModel.loadChat(event.channelId);
    await this.onOutputSelectedChannel({
      channelName: channel.channelName,
      conversationType: 'channel',
      channelId: event.channelId,
    });
  }

  /** Opens the selected channel details. */
  openChannelDetails(
    channelId: string,
    overlay: GroupDetailsOverlayComponent
  ): void {
    this.isChannelDetailsOpen.set(true);
    overlay.open(channelId);
  }

  /** Resets the channel details state after closing. */
  closeChannelDetails(): void {
    this.isChannelDetailsOpen.set(false);
  }

  headerChat() {
    const selected = this.selectedChat();
    const active = this.activeChat();

    if (selected?.type === 'channel' && active) {
      return {
        ...selected,
        name: active.channelName,
        description: active.description,
        members: this.mapChannelMembers(active.members ?? []),
      };
    }

    return selected;
  }

/** Toggles the thread panel for the given message. */
  selectedThreadMessage = signal<ChatMessage | null>(null);

  /** Opens the thread panel for the given message. */
  openThread(message: ChatMessage): void {
    this.selectedThreadMessage.set(message);
  }

  /** Closes the thread panel. */
  closeThread(): void {
    this.selectedThreadMessage.set(null);
  }

}

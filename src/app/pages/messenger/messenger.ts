import { AfterViewInit, Component, HostListener, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header } from '../../components/header/header';
import { ChatHeader, NewMessageRecipient } from '../../components/chat-header/chat-header';
import { UserProfileDialog } from '../../components/user-profile-dialog/user-profile-dialog';
import { WorkspaceMenu } from '../../components/workspace-menu/workspace-menu';
import { ChatPanel } from '../../components/chat-panel/chat-panel';
import { GroupDetailsOverlayComponent } from '../../components/group-details-overlay-component/group-details-overlay-component';
import { ThreadPanel } from '../../components/thread-panel/thread-panel';
import { ChatMessage } from '../../core/models/message.model';
import { Auth } from '../../core/services/auth';
import { ChatModel } from '../../core/chat.model';
import { MessengerHistory, MessengerConversationType } from './helpers/messenger-history';
import { MessengerConversations, MessengerConversationSelection } from './helpers/messenger-conversations';
import { MessengerNewMessage } from './helpers/messenger-new-message';

@Component({
  selector: 'app-messenger',
  imports: [
    Header, ChatHeader, UserProfileDialog, WorkspaceMenu, ChatPanel,
    CommonModule, GroupDetailsOverlayComponent, ThreadPanel
  ],
  templateUrl: './messenger.html',
  styleUrl: './messenger.scss'
})
export class Messenger implements AfterViewInit {
  private readonly auth = inject(Auth);
  private readonly chatModel = inject(ChatModel);
  private readonly conversations = new MessengerConversations(this.auth, this.chatModel);
  private readonly compose = new MessengerNewMessage(this.auth, this.chatModel);
  private readonly workspaceHistory = new MessengerHistory();

  @ViewChild('chatHeader') private chatHeader?: ChatHeader;
  @ViewChild('chatPanel') private chatPanel?: ChatPanel;
  @ViewChild('threadPanel') private threadPanel?: ThreadPanel;

  readonly isWorkspaceMenuOpen = signal(true);
  readonly isMobileChatOpen = signal(true);
  readonly isChannelDetailsOpen = signal(false);
  readonly chatType = signal<'channel' | 'direct-message' | 'new-message'>('new-message');
  readonly searchMessageId = signal<string | null>(null);
  readonly selectedThreadMessage = signal<ChatMessage | null>(null);
  readonly selectedChat = this.conversations.selectedChat;
  readonly newMessageRecipient = this.compose.recipient;
  readonly allUsers = this.auth.allUsers;
  readonly currentUser = this.auth.currentUser;
  readonly activeChat = this.chatModel.activeChat;

  /** Focuses the initial new-message input after the messenger renders. */
  ngAfterViewInit(): void {
    if (this.chatType() === 'new-message') this.focusNewMessageInput();
  }

  /** Opens a selected channel or direct conversation. */
  async onOutputSelectedChannel(event: MessengerConversationSelection, addToHistory = true): Promise<void> {
    this.chatPanel?.cancelActiveMessageEdit();
    this.closeThread();
    this.chatType.set(event.conversationType);
    if (event.conversationType === 'channel') await this.selectChannel(event);
    else this.selectDirectMessage(event.channelId);
    this.isMobileChatOpen.set(true);
    if (addToHistory) this.rememberConversation(event);
    this.focusChatInput();
  }

  /** Adds a selected conversation to the internal browser history. */
  private rememberConversation(event: MessengerConversationSelection): void {
    if (!event.channelId) return;
    this.workspaceHistory.push({
      dabubbleView: 'conversation', conversationType: event.conversationType,
      channelId: event.channelId, channelName: event.channelName, threadMessage: undefined
    });
  }

  /** Selects a channel using the existing channel service. */
  async selectChannel(event: MessengerConversationSelection): Promise<void> {
    await this.conversations.selectChannel(event);
  }

  /** Selects a direct conversation for the specified user. */
  selectDirectMessage(userId?: string): void {
    this.conversations.selectDirectMessage(userId);
  }

  /** Opens the empty new-message view and updates browser history. */
  openNewMessage(addToHistory = true): void {
    this.chatPanel?.cancelActiveMessageEdit();
    this.closeThread();
    this.chatType.set('new-message');
    this.isMobileChatOpen.set(true);
    this.focusNewMessageInput();
    if (addToHistory) this.workspaceHistory.push({
      dabubbleView: 'new-message', conversationType: undefined, channelId: undefined,
      channelName: undefined, threadMessage: undefined
    });
  }

  /** Restores a workspace view when navigating back or forward. */
  @HostListener('window:popstate', ['$event'])
  protected async handleBrowserHistory(event: PopStateEvent): Promise<void> {
    const state = this.workspaceHistory.fromEvent(event);
    if (!state?.dabubbleView || state.dabubbleView === 'new-message') {
      this.openNewMessage(false);
      return;
    }
    if (!state.conversationType || !state.channelId) return;
    await this.restoreHistoryConversation(state.conversationType, state.channelId, state.channelName);
    if (state.dabubbleView === 'thread' && state.threadMessage) this.openThread(state.threadMessage, false);
  }

  /** Reopens the conversation associated with a browser history entry. */
  private async restoreHistoryConversation(type: MessengerConversationType, id: string, name = ''): Promise<void> {
    if (type === 'channel') await this.chatModel.loadChat(id);
    await this.onOutputSelectedChannel({ channelName: name, conversationType: type, channelId: id }, false);
  }

  /** Focuses the main message input after the current view renders. */
  private focusChatInput(): void {
    requestAnimationFrame(() => this.chatPanel?.focusMessageInput());
  }

  /** Focuses the thread reply input after its view renders. */
  private focusThreadInput(): void {
    requestAnimationFrame(() => this.threadPanel?.focusReplyInput());
  }

  /** Focuses the recipient input after the compose view renders. */
  private focusNewMessageInput(): void {
    requestAnimationFrame(() => this.chatHeader?.focusNewMessageInput());
  }

  /** Opens a direct message from another user's profile. */
  protected async openDirectMessageFromProfile(userId: string): Promise<void> {
    const user = this.allUsers().find((item) => item.uid === userId);
    if (!user) return;
    await this.onOutputSelectedChannel({
      channelName: user.name, conversationType: 'direct-message', channelId: user.uid
    });
  }

  /** Returns the workspace's active conversation type. */
  protected getActiveWorkspaceConversationType(): MessengerConversationType | null {
    return this.conversations.activeConversationType();
  }

  /** Returns the workspace's active channel or user ID. */
  protected getActiveWorkspaceConversationId(): string | null {
    return this.conversations.activeConversationId();
  }

  /** Returns to the mobile workspace menu. */
  showMobileWorkspaceMenu(): void {
    this.isMobileChatOpen.set(false);
  }

  /** Opens the matching profile dialog for a selected user. */
  openUserProfile(userId: string, header: Header, dialog: UserProfileDialog): void {
    if (userId === this.currentUser()?.uid) {
      header.openProfileDialog();
      return;
    }
    dialog.openUserProfileDialog(userId);
  }

  /** Opens a channel selected from workspace search. */
  async openChannelFromSearch(event: { channelId: string; channelName: string }): Promise<void> {
    await this.chatModel.loadChat(event.channelId);
    await this.onOutputSelectedChannel({
      channelName: event.channelName, conversationType: 'channel', channelId: event.channelId
    });
  }

  /** Opens the conversation containing the searched message. */
  async openMessageFromSearch(event: {
    channelId: string; messageId: string; directMessageUserId?: string;
  }): Promise<void> {
    if (event.directMessageUserId) {
      await this.openDirectMessageSearchResult(event.directMessageUserId, event.messageId);
      return;
    }
    await this.openChannelMessageSearchResult(event.channelId, event.messageId);
  }

  /** Opens a searched message inside a direct conversation. */
  private async openDirectMessageSearchResult(userId: string, messageId: string): Promise<void> {
    await this.onOutputSelectedChannel({
      channelName: '', conversationType: 'direct-message', channelId: userId
    });
    this.searchMessageId.set(messageId);
  }

  /** Opens a searched message inside a channel. */
  private async openChannelMessageSearchResult(channelId: string, messageId: string): Promise<void> {
    const channel = await this.chatModel.getChat(channelId);
    if (!channel) return;
    await this.chatModel.loadChat(channelId);
    await this.onOutputSelectedChannel({
      channelName: channel.channelName, conversationType: 'channel', channelId
    });
    this.searchMessageId.set(messageId);
  }

  /** Opens the selected channel's details overlay. */
  openChannelDetails(channelId: string, overlay: GroupDetailsOverlayComponent): void {
    this.isChannelDetailsOpen.set(true);
    overlay.open(channelId);
  }

  /** Resets the channel details state after closing. */
  closeChannelDetails(): void {
    this.isChannelDetailsOpen.set(false);
  }

  /** Returns the selected chat with its current header information. */
  headerChat() {
    return this.conversations.headerChat();
  }

  /** Opens a thread and optionally records it in browser history. */
  openThread(message: ChatMessage, addToHistory = true): void {
    this.chatPanel?.cancelActiveMessageEdit();
    this.selectedThreadMessage.set(message);
    this.focusThreadInput();
    if (addToHistory) this.rememberThread(message);
  }

  /** Adds the opened thread to internal browser history. */
  private rememberThread(message: ChatMessage): void {
    const chat = this.selectedChat();
    if (!chat) return;
    this.workspaceHistory.push({
      dabubbleView: 'thread', conversationType: chat.type,
      channelId: chat.type === 'direct-message' ? chat.partnerId : chat.id,
      channelName: chat.name, threadMessage: message
    });
  }

  /** Closes the thread panel. */
  closeThread(): void {
    this.selectedThreadMessage.set(null);
  }

  /** Stores the recipient selected in the compose view. */
  setNewMessageRecipient(recipient: NewMessageRecipient): void {
    this.compose.setRecipient(recipient);
  }

  /** Clears the recipient selected in the compose view. */
  clearNewMessageRecipient(): void {
    this.compose.clearRecipient();
  }

  /** Returns the Firestore chat ID of the selected recipient. */
  newMessageTargetId(): string {
    return this.compose.targetId();
  }

  /** Opens the recipient's conversation after sending the composed message. */
  async openNewMessageRecipientChat(): Promise<void> {
    await this.compose.openRecipient((event) => this.onOutputSelectedChannel(event));
  }
}

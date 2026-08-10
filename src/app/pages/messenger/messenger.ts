import { Component } from '@angular/core';
import { Header } from '../../components/header/header';
import { ChatHeader } from '../../components/chat-header/chat-header';
import { UserProfileDialog } from '../../components/user-profile-dialog/user-profile-dialog';
import { WorkspaceMenu } from '../../components/workspace-menu/workspace-menu';
import { ChatPanel } from '../../components/chat-panel/chat-panel';
import { GroupDetailsOverlayComponent } from '../../components/group-details-overlay-component/group-details-overlay-component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-messenger',
  imports: [
    Header,
    ChatHeader,
    UserProfileDialog,
    WorkspaceMenu,
    ChatPanel,
    CommonModule,
    GroupDetailsOverlayComponent
  ],
  templateUrl: './messenger.html',
  styleUrl: './messenger.scss',
})
export class Messenger {
  isWorkspaceMenuOpen: boolean = true;
  isMobileChatOpen: boolean = false;
  isChannelDetailsOpen: boolean = false;
  chatType: 'channel' | 'direct-message' | 'new-message' = 'channel';

  /** Opens the selected conversation. */
  onOutputSelectedChannel($event: any) {
    this.chatType = $event.conversationType;
    this.isMobileChatOpen = true;
  }

  /** Opens the new message view in the chat header. */
  openNewMessage(): void {
    this.chatType = 'new-message';
    this.isMobileChatOpen = true;
  }

  /** Returns to the mobile workspace menu. */
  showMobileWorkspaceMenu(): void {
    this.isMobileChatOpen = false;
  }

  /** Opens the selected channel details. */
  openChannelDetails(
    channelId: string,
    overlay: GroupDetailsOverlayComponent
  ): void {
    this.isChannelDetailsOpen = true;
    overlay.open(channelId);
  }

  /** Resets the channel details state after closing. */
  closeChannelDetails(): void {
    this.isChannelDetailsOpen = false;
  }
}

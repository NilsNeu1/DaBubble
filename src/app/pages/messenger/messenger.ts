import { Component } from '@angular/core';
import { Header } from '../../components/header/header';
import { ChatHeader } from '../../components/chat-header/chat-header';
import { UserProfileDialog } from '../../components/user-profile-dialog/user-profile-dialog';
import { WorkspaceMenu } from '../../components/workspace-menu/workspace-menu';
import { ChatPanel } from '../../components/chat-panel/chat-panel';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-messenger',
  imports: [
    Header,
    ChatHeader,
    UserProfileDialog,
    WorkspaceMenu,
    ChatPanel,
    CommonModule
  ],
  templateUrl: './messenger.html',
  styleUrl: './messenger.scss',
})
export class Messenger {
  isWorkspaceMenuOpen: boolean = true;
  chatType: 'channel' | 'direct-message' = 'channel';

  onOutputSelectedChannel($event: any) {
   this.chatType = $event.conversationType;
  }
}

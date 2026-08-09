import { Component } from '@angular/core';
import { Header } from '../../components/header/header';
import { ChatHeader } from '../../components/chat-header/chat-header';
import { UserProfileDialog } from '../../components/user-profile-dialog/user-profile-dialog';
import { WorkspaceMenu } from '../../components/workspace-menu/workspace-menu';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-messenger',
  imports: [
    Header,
    ChatHeader,
    UserProfileDialog,
    WorkspaceMenu,
    CommonModule
  ],
  templateUrl: './messenger.html',
  styleUrl: './messenger.scss',
})
export class Messenger {

  isWorkspaceMenuOpen: boolean = true;
}

import { Component, Input, Output, EventEmitter, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateChannel } from '../create-channel/create-channel';
import { Auth } from '../../core/services/auth';
import { ChatModel } from '../../core/chat.model';

@Component({
  selector: 'app-workspace-menu',
  imports: [CommonModule, CreateChannel],
  templateUrl: './workspace-menu.html',
  styleUrl: './workspace-menu.scss',
})

export class WorkspaceMenu {
  isChannelOpen: boolean = true;
  hoverChannel: boolean = false;
  isDirectMessageOpen: boolean = true;
  hoverDirectMessage: boolean = false;
  isWorkspaceMenuOpen: boolean = true;
  hoverWorkspaceMenu: boolean = false;
  selectedChannel: string | null = null;
  selectedUser: string | null = null;

  @Output() workspaceMenuOpenChanged = new EventEmitter<boolean>();
  @Input() isOpen = false;
  @Output() newDirectMessage = new EventEmitter<boolean>();
  @Output() outputSelectedChannel = new EventEmitter<{
    channelName: string;
    conversationType: 'channel' | 'direct-message';
    channelId?: string;
  }>();
  currentUser = inject(Auth).currentUser;
  allUsers = inject(Auth).allUsers;
  private readonly chatModel = inject(ChatModel);

  readonly channels = this.chatModel.channels;

  /** Initializes the automatic direct-message selection. */
  constructor() {
    effect(() => {
      const memberships = this.currentUser()?.channelMemberships ?? {};
      this.chatModel.getChannels(Object.keys(memberships));
    });
  }

  /** Toggles the visibility of the channel list. */
  toggleChannel() {
    if (this.isChannelOpen) {
      this.isChannelOpen = false;
    } else {
      this.isChannelOpen = true;
    }
  }

  /** Toggles the visibility of the direct-message list. */
  toggleDirectMessage() {
    if (this.isDirectMessageOpen) {
      this.isDirectMessageOpen = false;
    } else {
      this.isDirectMessageOpen = true;
    }
  }

  /** Toggles the workspace menu and emits its updated visibility state. */
  toggleWorkspaceMenu() {
    if (this.isWorkspaceMenuOpen) {
      this.isWorkspaceMenuOpen = false;
    } else {
      this.isWorkspaceMenuOpen = true;
    }
    this.workspaceMenuOpenChanged.emit(this.isWorkspaceMenuOpen);
  }

  /** Returns the workspace toggle icon for the current open and hover state. */
  getWorkspaceToggleIcon() {
    if (this.hoverWorkspaceMenu && this.isWorkspaceMenuOpen) {
      return 'assets/Group 2-hover.png';
    } else if (this.hoverWorkspaceMenu && !this.isWorkspaceMenuOpen) {
      return 'assets/Group 1-hover.png';
    }

    if (this.isWorkspaceMenuOpen) {
      return 'assets/Group 2.png';
    } else {
      return 'assets/Group 1.png';
    }
  }

  /** Returns the matching arrow icon for a collapsible workspace section. */
  channelIconToggle(ref: 'isChannelOpen' | 'isDirectMessageOpen', refHover: 'hoverDirectMessage' | 'hoverChannel'): string {
    if (this[refHover] && this[ref]) {
      return 'assets/arrow_drop_down-hover.png';
    } else if (this[refHover] && !this[ref]) {
      return 'assets/arrow_drop_down-right-hover.png';
    }

    if (this[ref]) {
      return 'assets/arrow_drop_down.png';
    } else {
      return 'assets/arrow_drop_down-right.png';
    }
  }

  /** Marks a channel as selected and clears the selected direct-message user. */
  openChannel(channelName: string) {
    this.selectedChannel = channelName;
    this.selectedUser = null;
  }

  /** Marks a direct-message user as selected and clears the selected channel. */
  openDirectMessage(userName: string) {
    this.selectedUser = userName;
    this.selectedChannel = null;
  }

  /** Requests opening the new direct-message view. */
  openNewDirectMessage() {
    this.newDirectMessage.emit();
  }

  /** Opens the create-channel overlay when it is currently closed. */
  openOverlay() {
    if (!this.isOpen) {
      this.isOpen = true;
    }
  }

  /** Loads a chat when an ID is available and emits the selected conversation. */
  async openChat(channelName: string, conversationType: 'channel' | 'direct-message', channelId?: string) {
    if (channelId) {
      this.chatModel.loadChat(channelId);
    }
    this.outputSelectedChannel.emit({ channelName, conversationType, channelId });
  }
}


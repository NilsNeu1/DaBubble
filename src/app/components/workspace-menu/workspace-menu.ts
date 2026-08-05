import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workspace-menu',
  imports: [CommonModule],
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

  channels = [
    { channelName: 'Entwickler' },
    { channelName: 'Design' }
  ];

  directMessages = [
    { UserName: 'Max Mustermann', UserImage: 'assets/01.Charaters.png', online: true },
    { UserName: 'Erika Mustermann', UserImage: 'assets/02.Charaters.png', online: false },
    { UserName: 'John Doe', UserImage: 'assets/03.Charaters.png', online: false }
  ];


  toggleChannel() {
    if (this.isChannelOpen) {
      this.isChannelOpen = false;
    } else {
      this.isChannelOpen = true;
    }
  }

  toggleDirectMessage() {
    if (this.isDirectMessageOpen) {
      this.isDirectMessageOpen = false;
    } else {
      this.isDirectMessageOpen = true;
    }
  }

  toggleWorkspaceMenu() {
    if (this.isWorkspaceMenuOpen) {
      this.isWorkspaceMenuOpen = false;
    } else {
      this.isWorkspaceMenuOpen = true;
    }
  }

  getWorkspaceToggleIcon(){
    if(this.hoverWorkspaceMenu && this.isWorkspaceMenuOpen){
      return 'assets/Group 2-hover.png';
    }else if(this.hoverWorkspaceMenu && !this.isWorkspaceMenuOpen){
      return 'assets/Group 1-hover.png';
    }

    if(this.isWorkspaceMenuOpen){
      return 'assets/Group 2.png';
    } else {
      return 'assets/Group 1.png';
    }
  }

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



  openChannel(channelName: string) {
    this.selectedChannel = channelName;
    this.selectedUser = null;
  }

  openDirectMessage(userName: string) {
    this.selectedUser = userName;
     this.selectedChannel = null;
  }

  openNewDirectMessage(){

  }

  createChatGroup(){
  }
}
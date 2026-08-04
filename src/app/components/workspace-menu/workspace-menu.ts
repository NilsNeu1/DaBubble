import { Component } from '@angular/core';

@Component({
  selector: 'app-workspace-menu',
  imports: [],
  templateUrl: './workspace-menu.html',
  styleUrl: './workspace-menu.scss',
})
export class WorkspaceMenu {
isChannelOpen: boolean = true;
isDirectMessageOpen: boolean = true;
}

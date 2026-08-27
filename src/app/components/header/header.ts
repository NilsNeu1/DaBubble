import {
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import {
  Router,
  RouterLink
} from '@angular/router';
import { Auth } from '../../core/services/auth';
import { ProfileDialog } from '../profile-dialog/profile-dialog';
import {
  HeaderSearch,
  WorkspaceSearchResult,
} from './header-search';

@Component({
  selector: 'app-header',
  imports: [ProfileDialog, RouterLink],
  providers: [HeaderSearch],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);
  private readonly headerSearch = inject(HeaderSearch);

  /** Provides the currently authenticated user. */
  protected readonly currentUser = this.authService.currentUser;

  /** References the native user menu dialog. */
  @ViewChild('userDialog')
  private userDialog!: ElementRef<HTMLDialogElement>;

  /** References the profile dialog component. */
  @ViewChild('profileDialogComponent')
  private profileDialogComponent!: ProfileDialog;

  /** Defines where the header is displayed. */
  public readonly mode = input<'workspace' | 'legal'>('workspace');

  /** Indicates whether a mobile chat view is active. */
  public readonly isMobileChatView = input(false);

  /** Emits when the mobile back button is selected. */
  public readonly mobileBackRequested = output<void>();

  /** Emits the selected user ID from the workspace search. */
  public readonly userProfileRequested = output<string>();

  /** Emits the selected channel from the workspace search. */
  public readonly channelRequested = output<{
    channelId: string;
    channelName: string;
  }>();

  /** Emits the selected message location from the workspace search. */
  public readonly messageRequested = output<{
    channelId: string;
    messageId: string;
  }>();

  /** Defines the breakpoint for the mobile user menu. */
  private readonly mobileBreakpoint = '(max-width: 1024px)';

  /** Tracks whether the user menu is open. */
  protected readonly isUserMenuOpen = signal(false);

  /** Tracks whether the mobile menu is closing. */
  protected readonly isUserMenuClosing = signal(false);

  /** Tracks whether the profile should open after closing the user menu. */
  private readonly shouldOpenProfile = signal(false);

  /** Provides the current workspace search value. */
  protected readonly workspaceSearchTerm = this.headerSearch.searchTerm;

  /** Provides matching workspace search suggestions. */
  protected readonly workspaceSearchSuggestions =
    this.headerSearch.suggestions;

  /** Indicates whether search suggestions are available. */
  protected readonly isSearchSuggestionListOpen =
    this.headerSearch.hasSuggestions;

  /** Indicates whether the mobile search view is active. */
  protected readonly isMobileSearchActive =
    this.headerSearch.isMobileActive;

  /** Closes the user menu before opening the profile dialog. */
  protected openProfileFromUserMenu(): void {
    this.shouldOpenProfile.set(true);
    this.closeUserMenu();
  }

  /** Requests returning to the mobile workspace menu. */
  protected requestMobileBack(): void {
    this.mobileBackRequested.emit();
  }

  /** Handles selecting a workspace search result. */
  protected selectWorkspaceSearchResult(
    result: WorkspaceSearchResult
  ): void {
    this.emitWorkspaceSearchResult(result);
    this.clearWorkspaceSearch();
  }

  /** Emits the matching event for one workspace search result. */
  private emitWorkspaceSearchResult(
    result: WorkspaceSearchResult
  ): void {
    if (result.type === 'user') {
      this.emitUserSearchResult(result);
      return;
    }
    if (result.type === 'channel') {
      this.emitChannelSearchResult(result);
      return;
    }
    this.emitMessageSearchResult(result);
  }

  /** Emits the selected user search result. */
  private emitUserSearchResult(
    result: WorkspaceSearchResult
  ): void {
    this.userProfileRequested.emit(result.id);
  }

  /** Emits the selected channel search result. */
  private emitChannelSearchResult(
    result: WorkspaceSearchResult
  ): void {
    this.channelRequested.emit({
      channelId: result.id,
      channelName: result.label,
    });
  }

  /** Emits the selected message result when its location is valid. */
  private emitMessageSearchResult(
    result: WorkspaceSearchResult
  ): void {
    if (!result.channelId || !result.messageId) return;
    this.messageRequested.emit({
      channelId: result.channelId,
      messageId: result.messageId,
    });
  }

  /** Opens or closes the user menu. */
  protected toggleUserMenu(): void {
    this.isUserMenuOpen()
      ? this.closeUserMenu()
      : this.openUserMenu();
  }

  /** Updates the shared workspace search value. */
  protected updateWorkspaceSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.headerSearch.updateTerm(input.value);
  }

  /** Clears the shared workspace search value. */
  protected clearWorkspaceSearch(): void {
    this.headerSearch.clearTerm();
  }

  /** Opens the user menu as a modal dialog. */
  protected openUserMenu(): void {
    this.isUserMenuClosing.set(false);
    this.userDialog.nativeElement.showModal();
    this.isUserMenuOpen.set(true);
  }

  /** Starts the mobile exit animation or closes directly. */
  protected closeUserMenu(): void {
    if (this.isMobileViewport()) {
      this.isUserMenuClosing.set(true);
      return;
    }
    this.finishUserMenuClose();
  }

  /** Closes the dialog after the exit animation. */
  protected handleUserMenuAnimationEnd(
    event: AnimationEvent
  ): void {
    if (!this.isUserMenuClosing()) return;
    if (event.target !== this.userDialog.nativeElement) return;
    this.finishUserMenuClose();
  }

  /** Handles closing the dialog with Escape. */
  protected handleUserMenuCancel(event: Event): void {
    event.preventDefault();
    this.closeUserMenu();
  }

  /** Resets the menu state and opens a pending profile dialog. */
  protected handleUserMenuClosed(): void {
    this.isUserMenuOpen.set(false);
    this.isUserMenuClosing.set(false);
    this.openPendingProfile();
  }

  /** Closes the menu when the backdrop is clicked. */
  protected closeUserMenuFromBackdrop(
    event: MouseEvent
  ): void {
    if (event.target === this.userDialog.nativeElement) {
      this.closeUserMenu();
    }
  }

  /** Finishes closing the native dialog. */
  private finishUserMenuClose(): void {
    const dialog = this.userDialog.nativeElement;
    if (dialog.open) dialog.close();
    this.isUserMenuOpen.set(false);
    this.isUserMenuClosing.set(false);
  }

  /** Checks whether the mobile layout is active. */
  private isMobileViewport(): boolean {
    return window.matchMedia(this.mobileBreakpoint).matches;
  }

  /** Logs the current user out and redirects to the login page. */
  protected async logout(): Promise<void> {
    this.closeUserMenu();
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }

  /** Opens the current user's profile dialog. */
  public openProfileDialog(): void {
    this.profileDialogComponent.openProfileDialog();
  }

  /** Opens the profile after the user menu has fully closed. */
  private openPendingProfile(): void {
    if (!this.shouldOpenProfile()) return;
    this.shouldOpenProfile.set(false);
    this.profileDialogComponent.openProfileDialog();
  }
}
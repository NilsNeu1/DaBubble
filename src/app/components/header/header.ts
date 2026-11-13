import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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

  protected readonly currentUser = this.authService.currentUser;

  @ViewChild('userMenu')
  private userMenu?: ElementRef<HTMLDivElement>;

  @ViewChild('profileDialogComponent')
  private profileDialogComponent!: ProfileDialog;

  @ViewChild('desktopSearchResults')
  private desktopSearchResults?: ElementRef<HTMLDivElement>;

  public readonly mode = input<'workspace' | 'legal'>('workspace');
  public readonly isMobileChatView = input(false);
  public readonly mobileBackRequested = output<void>();
  public readonly userProfileRequested = output<string>();

  public readonly channelRequested = output<{
    channelId: string;
    channelName: string;
  }>();

  public readonly messageRequested = output<{
    channelId: string;
    messageId: string;
    directMessageUserId?: string;
  }>();

  protected readonly isUserMenuOpen = signal(false);
  private readonly isWorkspaceSearchOpen = signal(false);
  protected readonly selectedWorkspaceSearchIndex = signal(0);
  protected readonly workspaceSearchTerm = this.headerSearch.searchTerm;
  protected readonly workspaceSearchSuggestions = this.headerSearch.suggestions;

  protected readonly isSearchSuggestionListOpen = computed(
    () => this.isWorkspaceSearchOpen() &&
      this.workspaceSearchSuggestions().length > 0
  );

  protected readonly isMobileSearchActive = this.headerSearch.isMobileActive;

  /** Closes the user menu and opens the current user's profile. */
  protected openProfileFromUserMenu(): void {
    this.closeUserMenu();
    this.openProfileDialog();
  }

  /** Requests returning to the mobile workspace menu. */
  protected requestMobileBack(): void {
    this.mobileBackRequested.emit();
  }

  /** Handles selecting a workspace search result. */
  protected selectWorkspaceSearchResult(result: WorkspaceSearchResult): void {
    this.emitWorkspaceSearchResult(result);
    this.clearWorkspaceSearch();
    this.isWorkspaceSearchOpen.set(false);
  }

  /** Emits the matching event for one workspace search result. */
  private emitWorkspaceSearchResult(result: WorkspaceSearchResult): void {
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
  private emitUserSearchResult(result: WorkspaceSearchResult): void {
    this.userProfileRequested.emit(result.id);
  }

  /** Emits the selected channel search result. */
  private emitChannelSearchResult(result: WorkspaceSearchResult): void {
    this.channelRequested.emit({
      channelId: result.id,
      channelName: result.label,
    });
  }

  /** Emits the selected message result when its location is valid. */
  private emitMessageSearchResult(result: WorkspaceSearchResult): void {
    if (!result.channelId || !result.messageId) return;
    this.messageRequested.emit({
      channelId: result.channelId,
      messageId: result.messageId,
      directMessageUserId: result.directMessageUserId,
    });
  }

  /** Opens or closes the user menu. */
  protected toggleUserMenu(): void {
    if (this.isUserMenuOpen()) {
      this.closeUserMenu();
      return;
    }
    this.openUserMenu();
  }

  /** Opens the user menu and focuses its content. */
  protected openUserMenu(): void {
    this.isUserMenuOpen.set(true);
    requestAnimationFrame(() => this.userMenu?.nativeElement.focus());
  }

  /** Closes the user menu immediately. */
  protected closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  /** Closes the user menu when Escape is pressed. */
  @HostListener('document:keydown.escape')
  protected closeUserMenuOnEscape(): void {
    if (this.isUserMenuOpen()) this.closeUserMenu();
  }

  /** Updates the shared workspace search value. */
  protected updateWorkspaceSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.workspaceSearchTerm.set(input.value);
    this.isWorkspaceSearchOpen.set(true);
  }

  /** Reopens workspace suggestions when search receives focus. */
  protected openWorkspaceSearchSuggestions(): void {
    this.isWorkspaceSearchOpen.set(true);
  }

  /** Closes workspace suggestions after clicking outside search. */
  @HostListener('document:click', ['$event'])
  protected closeWorkspaceSearchSuggestions(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('.app-header__search')) return;
    this.isWorkspaceSearchOpen.set(false);
  }

  /** Clears the shared workspace search value. */
  protected clearWorkspaceSearch(): void {
    this.headerSearch.clearTerm();
    this.selectedWorkspaceSearchIndex.set(0);
  }

  /** Handles keyboard navigation in workspace search. */
  protected onWorkspaceSearchKeydown(event: KeyboardEvent): void {
    const suggestions = this.workspaceSearchSuggestions();
    if (!this.isSearchSuggestionListOpen() || !suggestions.length || event.isComposing) return;
    if (event.key === 'ArrowDown') return this.moveWorkspaceSearchSelection(event, 1);
    if (event.key === 'ArrowUp') return this.moveWorkspaceSearchSelection(event, -1);
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const result = suggestions[this.selectedWorkspaceSearchIndex()] ?? suggestions[0];
    this.selectWorkspaceSearchResult(result);
  }

  /** Moves the selected workspace search result. */
  private moveWorkspaceSearchSelection(event: KeyboardEvent, direction: number): void {
    event.preventDefault();
    const count = this.workspaceSearchSuggestions().length;
    this.selectedWorkspaceSearchIndex.update(
      (index) => (index + direction + count) % count
    );
    this.scrollSelectedWorkspaceResult();
  }

  /** Keeps the selected desktop search result visible. */
  private scrollSelectedWorkspaceResult(): void {
    const results = this.desktopSearchResults?.nativeElement;
    const index = this.selectedWorkspaceSearchIndex();
    results
      ?.querySelectorAll('.app-header__search-result')
    [index]?.scrollIntoView({ block: 'nearest' });
  }

  /** Logs the current user out and redirects to login. */
  protected async logout(): Promise<void> {
    this.closeUserMenu();
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }

  /** Opens the current user's profile dialog. */
  public openProfileDialog(): void {
    this.profileDialogComponent.openProfileDialog();
  }
}
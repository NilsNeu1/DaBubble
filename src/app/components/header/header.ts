import {
  Component,
  computed,
  ElementRef,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import {
  ProfileDialog
} from '../profile-dialog/profile-dialog';
import {
  RouterLink
} from '@angular/router';

type WorkspaceSearchResultType = 'user' | 'channel' | 'message';

interface WorkspaceSearchResult {
  id: string;
  type: WorkspaceSearchResultType;
  label: string;
  avatarUrl?: string;
  status?: 'online' | 'offline';
  contextLabel?: string;
  authorName?: string;
  timestamp?: string;
}

@Component({
  selector: 'app-header',
  imports: [ProfileDialog, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  /** References the native user menu dialog. */
  @ViewChild('userDialog')
  private userDialog!: ElementRef<HTMLDialogElement>;

  /** References the profile dialog component. */
  @ViewChild('profileDialogComponent')
  private profileDialogComponent!: ProfileDialog;

  /** Defines where the header is displayed. */
  public readonly mode = input<'workspace' | 'legal'>('workspace');

  /** Defines the breakpoint for the mobile user menu. */
  private readonly mobileBreakpoint = '(max-width: 1024px)';

  /** Tracks whether the user menu is open. */
  protected readonly isUserMenuOpen = signal(false);

  /** Tracks whether the mobile menu is closing. */
  protected readonly isUserMenuClosing = signal(false);

  /** Tracks whether the profile should open after closing the user menu. */
  private readonly shouldOpenProfile = signal(false);

  /** Stores the current workspace search value. */
  protected readonly workspaceSearchTerm = signal('');

  /** Indicates whether the mobile search view is active. */
  protected readonly isMobileSearchActive = computed(
    () => this.workspaceSearchTerm().length > 0
  );

  /** Closes the user menu before opening the profile dialog. */
  protected openProfileFromUserMenu(): void {
    this.shouldOpenProfile.set(true);
    this.closeUserMenu();
  }

  /** TEMP-HEADER-PREVIEW: Provides users for testing search suggestions. */
  private readonly tempUserSuggestions: WorkspaceSearchResult[] = [
    {
      id: 'temp-user-current',
      type: 'user',
      label: 'Header Testuser (Du)',
      avatarUrl: 'assets/default-user-avatar.png',
      status: 'online',
    },
    {
      id: 'temp-user-1',
      type: 'user',
      label: 'Search Testuser 01',
      avatarUrl: 'assets/00.Charaters.png',
      status: 'online',
    },
    {
      id: 'temp-user-2',
      type: 'user',
      label: 'Search Testuser 02',
      avatarUrl: 'assets/01.Charaters.png',
      status: 'offline',
    },
    {
      id: 'temp-user-3',
      type: 'user',
      label: 'Search Testuser 03',
      avatarUrl: 'assets/02.Charaters.png',
      status: 'online',
    },
    {
      id: 'temp-user-4',
      type: 'user',
      label: 'Search Testuser 04',
      avatarUrl: 'assets/03.Charaters.png',
      status: 'offline',
    },
    {
      id: 'temp-user-5',
      type: 'user',
      label: 'Search Testuser 05',
      avatarUrl: 'assets/04.Charaters.png',
      status: 'online',
    },
  ];

  /** TEMP-HEADER-PREVIEW: Provides channels for testing search suggestions. */
  private readonly tempChannelSuggestions: WorkspaceSearchResult[] = [
    {
      id: 'temp-channel-1',
      type: 'channel',
      label: 'TEMP Allgemein',
    },
    {
      id: 'temp-channel-2',
      type: 'channel',
      label: 'TEMP Entwicklerteam',
    },
    {
      id: 'temp-channel-3',
      type: 'channel',
      label: 'TEMP Office-team',
    },
  ];

  /** TEMP-HEADER-PREVIEW: Provides messages for testing workspace search. */
  private readonly tempMessageSuggestions: WorkspaceSearchResult[] = [
    {
      id: 'temp-message-1',
      type: 'message',
      label: 'Welche Version ist aktuell von Angular?',
      contextLabel: '# TEMP Entwicklerteam',
      authorName: 'Testuser 03',
      timestamp: '14:25 Uhr',
      avatarUrl: 'assets/02.Charaters.png',
    },
    {
      id: 'temp-message-2',
      type: 'message',
      label: 'Ich habe die gleiche Frage zur Angular Version.',
      contextLabel: 'Direktnachricht',
      authorName: 'Testuser 02',
      timestamp: '14:30 Uhr',
      avatarUrl: 'assets/01.Charaters.png',
    },
    {
      id: 'temp-message-3',
      type: 'message',
      label: 'Die Firebase-Anbindung machen wir später.',
      contextLabel: '# TEMP Office-team',
      authorName: 'Header Testuser (Du)',
      timestamp: 'Gestern',
      avatarUrl: 'assets/default-user-avatar.png',
    },
    {
      id: 'temp-message-4',
      type: 'message',
      label: 'Der mobile Header funktioniert jetzt responsive.',
      contextLabel: '# TEMP Allgemein',
      authorName: 'Testuser 05',
      timestamp: 'Montag',
      avatarUrl: 'assets/04.Charaters.png',
    },
    {
      id: 'temp-message-5',
      type: 'message',
      label: 'Die Suchergebnisse sollen übersichtlich dargestellt werden.',
      contextLabel: '# TEMP Entwicklerteam',
      authorName: 'Testuser 01',
      timestamp: '28.07.2025, 09:40 Uhr',
      avatarUrl: 'assets/00.Charaters.png',
    },
    {
      id: 'temp-message-6',
      type: 'message',
      label: 'Diese Nachricht ist ein Beispiel aus einem früheren Jahr.',
      contextLabel: 'Direktnachricht Testuser 04',
      authorName: 'Testuser 04',
      timestamp: '28.07.2025, 16:20 Uhr',
      avatarUrl: 'assets/03.Charaters.png',
    },
  ];

  /** Returns matching suggestions for the current search value. */
  protected readonly workspaceSearchSuggestions = computed(() => {
    const term = this.workspaceSearchTerm().trim();

    if (!term) return [];

    return this.getSearchSuggestions(term);
  });

  /** Indicates whether search suggestions are available. */
  protected readonly isSearchSuggestionListOpen = computed(
    () => this.workspaceSearchSuggestions().length > 0
  );

  /** Opens or closes the user menu. */
  protected toggleUserMenu(): void {
    this.isUserMenuOpen()
      ? this.closeUserMenu()
      : this.openUserMenu();
  }

  /** Updates the shared workspace search value. */
  protected updateWorkspaceSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.workspaceSearchTerm.set(input.value);
  }

  /** Clears the shared workspace search value. */
  protected clearWorkspaceSearch(): void {
    this.workspaceSearchTerm.set('');
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
  protected handleUserMenuAnimationEnd(event: AnimationEvent): void {
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
  protected closeUserMenuFromBackdrop(event: MouseEvent): void {
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

  /** Selects the temporary suggestions for the entered prefix. */
  private getSuggestionsByPrefix(
    prefix: string
  ): WorkspaceSearchResult[] {
    return prefix === '@'
      ? this.tempUserSuggestions
      : this.tempChannelSuggestions;
  }

  /** Selects the correct search mode for the entered value. */
  private getSearchSuggestions(
    term: string
  ): WorkspaceSearchResult[] {
    const prefix = term.charAt(0);

    return prefix === '@' || prefix === '#'
      ? this.filterPrefixSuggestions(prefix, term.slice(1))
      : this.filterMessageSuggestions(term);
  }

  /** Filters user or channel suggestions. */
  private filterPrefixSuggestions(
    prefix: string,
    query: string
  ): WorkspaceSearchResult[] {
    const normalizedQuery = query.trim().toLowerCase();

    return this.getSuggestionsByPrefix(prefix).filter(({ label }) =>
      label.toLowerCase().includes(normalizedQuery)
    );
  }

  /** Filters temporary messages and their context information. */
  private filterMessageSuggestions(
    query: string
  ): WorkspaceSearchResult[] {
    const normalizedQuery = query.toLowerCase();

    return this.tempMessageSuggestions.filter((message) =>
      this.matchesMessageSearch(message, normalizedQuery)
    );
  }

  /** Checks whether a message matches the search value. */
  private matchesMessageSearch(
    message: WorkspaceSearchResult,
    query: string
  ): boolean {
    const searchableText = [
      message.label,
      message.contextLabel,
      message.authorName,
    ].join(' ').toLowerCase();

    return searchableText.includes(query);
  }

  /** Opens the profile after the user menu has fully closed. */
  private openPendingProfile(): void {
    if (!this.shouldOpenProfile()) return;

    this.shouldOpenProfile.set(false);
    this.profileDialogComponent.openProfileDialog();
  }
}
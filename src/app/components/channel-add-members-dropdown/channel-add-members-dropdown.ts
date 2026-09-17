import {
  Component,
  computed,
  input,
  output,
  signal,
  inject,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { Auth } from '../../core/services/auth';
import { firestore } from '../../core/firebase.config';
import { Firestore } from 'firebase/firestore';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface AddMemberSuggestion {
  uid: string;
  name: string;
  avatarUrl: string;
  status: 'online' | 'offline';
}

@Component({
  selector: 'app-channel-add-members-dropdown',
  imports: [],
  templateUrl: './channel-add-members-dropdown.html',
  styleUrl: './channel-add-members-dropdown.scss',
})
export class ChannelAddMembersDropdown {
  allUsers = inject(Auth).allUsers;
  isAddingMembers = false;

  /** Receives the active channel name. */
  public readonly channelName = input.required<string>();

  /** Receives the active channel ID. */
  public readonly channelId = input.required<string>();

  /** Receives the active channel members. */
  public readonly members = input.required<AddMemberSuggestion[]>();

  /** Checks whether a user is already a member of the active channel. */
  private isAlreadyChannelMember(userId: string): boolean {
    return this.members().some((member) => member.uid === userId);
  }

  /** TEMP: Provides users that are not part of the active channel yet. */
  private readonly tempAddMemberSuggestions: AddMemberSuggestion[] = [
    {
      uid: 'temp-user-elise',
      name: 'Elise Roth',
      avatarUrl: 'assets/03.Charaters.png',
      status: 'offline',
    },
    {
      uid: 'temp-user-elias',
      name: 'Elias Neumann',
      avatarUrl: 'assets/04.Charaters.png',
      status: 'online',
    },
  ];

  /** Stores the current add-member search value. */
  protected readonly searchTerm = signal('');

  /** Tracks the selected member suggestion for keyboard navigation. */
  protected readonly selectedSuggestionIndex = signal(0);

  /** Tracks whether the add-member search has focus. */
  protected readonly isMemberSearchFocused = signal(false);

  /** Stores the currently selected channel members. */
  protected readonly selectedMembers = signal<AddMemberSuggestion[]>([]);

  /** Indicates whether at least one member is selected. */
  protected readonly hasSelectedMembers = computed(
    () => this.selectedMembers().length > 0
  );

  /** Returns matching temporary user suggestions. */
  protected readonly filteredSuggestions = computed(() => {
    const term = this.searchTerm().trim();

    if (!term) return [];

    return this.filterSuggestions(term);
  });

  /** Indicates whether search suggestions are available. */
  protected readonly isSuggestionListOpen = computed(
    () => this.isMemberSearchFocused()
      && this.filteredSuggestions().length > 0
  );

  /** Emits when the add-member dropdown should close. */
  public readonly closeRequested = output<void>();

  /** Requests closing the add-member dropdown. */
  protected requestClose(): void {
    this.closeRequested.emit();
    this.selectedMembers.set([]);
    this.searchTerm.set('');
  }

  /** References the add-member search results for keyboard navigation. */
  @ViewChild('memberSearchResults')
  private memberSearchResults?: ElementRef<HTMLDivElement>;

  /** Updates the add-member search value. */
  protected updateSearchTerm(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.selectedSuggestionIndex.set(0);
  }

  /** Filters temporary users by the entered name. */
  private filterSuggestions(query: string): AddMemberSuggestion[] {
    const normalizedQuery = query.toLowerCase();
    const tolerantQuery = normalizedQuery.slice(0, -1);

    return this.allUsers().filter((user) =>
      !this.isAlreadyChannelMember(user.uid) &&
      !this.isMemberSelected(user.uid) &&
      this.matchesSearch(user.name, normalizedQuery, tolerantQuery)
    );
  }

  /** Checks whether a user name matches the search value. */
  private matchesSearch(
    name: string,
    query: string,
    tolerantQuery: string
  ): boolean {
    const normalizedName = name.toLowerCase();

    return normalizedName.includes(query)
      || query.length >= 4 && normalizedName.includes(tolerantQuery);
  }

  /** Adds a suggested member to the current selection. */
  protected selectMember(member: AddMemberSuggestion): void {
    if (this.isMemberSelected(member.uid)) return;

    this.selectedMembers.update((members) => [...members, member]);
    this.searchTerm.set('');
    this.selectedSuggestionIndex.set(0);
  }

  /** Removes a member from the current selection. */
  protected removeSelectedMember(memberId: string): void {
    this.selectedMembers.update((members) =>
      members.filter(({ uid }) => uid !== memberId)
    );
  }

  /** Handles keyboard navigation and removal of selected members. */
  protected handleSearchKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'Backspace' && !this.searchTerm()) {
      const lastMember = this.selectedMembers().at(-1);
      if (lastMember) this.removeSelectedMember(lastMember.uid);
      return;
    }
    if (!this.isSuggestionListOpen()) return;
    if (event.key === 'ArrowDown') this.moveSuggestionSelection(event, 1);
    if (event.key === 'ArrowUp') this.moveSuggestionSelection(event, -1);
    if (event.key === 'Enter') this.confirmSuggestionSelection(event);
  }

  /** Moves the selected member suggestion in the given direction. */
  private moveSuggestionSelection(event: KeyboardEvent, direction: number): void {
    const count = this.filteredSuggestions().length;
    if (!count) return;
    event.preventDefault();
    this.selectedSuggestionIndex.update(
      (index) => (index + direction + count) % count
    );
    this.scrollSelectedSuggestion();
  }

  /** Adds the currently selected member to the selection. */
  private confirmSuggestionSelection(event: KeyboardEvent): void {
    const member = this.filteredSuggestions()[this.selectedSuggestionIndex()];
    if (!member) return;
    event.preventDefault();
    this.selectMember(member);
  }

  /** Keeps the selected member suggestion visible. */
  private scrollSelectedSuggestion(): void {
    const results = this.memberSearchResults?.nativeElement;
    const index = this.selectedSuggestionIndex();
    results
      ?.querySelectorAll('.channel-add-members-dropdown__search-result')
    [index]?.scrollIntoView({ block: 'nearest' });
  }

  /** Checks whether a member is already selected. */
  private isMemberSelected(memberId: string): boolean {
    return this.selectedMembers().some(({ uid }) => uid === memberId);
  }

  /** Adds the selected user to the channel. */
  async addUserToChannel() {
    this.isAddingMembers = true;
    const channelId = this.channelId();
    const channelRef = doc(firestore, 'chats', channelId);

    for (let i = 0; i < this.selectedMembers().length; i++) {
      await updateDoc(channelRef, {
        members: arrayUnion({
          avatarUrl: this.selectedMembers()[i].avatarUrl,
          name: this.selectedMembers()[i].name,
          role: 'member',
          uid: this.selectedMembers()[i].uid,
        }),
      });
    }

    for (let i = 0; i < this.selectedMembers().length; i++) {
      await this.addChannelToUser(channelId, this.selectedMembers()[i].uid);
    }

    this.isAddingMembers = false;
    this.requestClose();
  }

  /** Adds a channel to a user's channel memberships. */
  async addChannelToUser(channelId: string, userId: string): Promise<void> {
    if (!userId) {
      return;
    }
    const userRef = doc(firestore, 'users', userId);

    await updateDoc(userRef, {
      [`channelMemberships.${channelId}`]: {
        channelId: channelId,
      },
    });
  }
}




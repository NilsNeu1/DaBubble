import {
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

interface AddMemberSuggestion {
  id: string;
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
  /** Receives the active channel name. */
  public readonly channelName = input.required<string>();

  /** TEMP: Provides users that are not part of the active channel yet. */
  private readonly tempAddMemberSuggestions: AddMemberSuggestion[] = [
    {
      id: 'temp-user-elise',
      name: 'Elise Roth',
      avatarUrl: 'assets/03.Charaters.png',
      status: 'offline',
    },
    {
      id: 'temp-user-elias',
      name: 'Elias Neumann',
      avatarUrl: 'assets/04.Charaters.png',
      status: 'online',
    },
  ];

  /** Stores the current add-member search value. */
  protected readonly searchTerm = signal('');

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
    () => this.filteredSuggestions().length > 0
  );

  /** Emits when the add-member dropdown should close. */
  public readonly closeRequested = output<void>();

  /** Requests closing the add-member dropdown. */
  protected requestClose(): void {
    this.closeRequested.emit();
  }

  /** Updates the add-member search value. */
  protected updateSearchTerm(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  /** Filters temporary users by the entered name. */
  private filterSuggestions(query: string): AddMemberSuggestion[] {
    const normalizedQuery = query.toLowerCase();
    const tolerantQuery = normalizedQuery.slice(0, -1);

    return this.tempAddMemberSuggestions.filter((member) =>
      !this.isMemberSelected(member.id)
      && this.matchesSearch(member.name, normalizedQuery, tolerantQuery)
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
    if (this.isMemberSelected(member.id)) return;

    this.selectedMembers.update((members) => [...members, member]);
    this.searchTerm.set('');
  }

  /** Removes a member from the current selection. */
  protected removeSelectedMember(memberId: string): void {
    this.selectedMembers.update((members) =>
      members.filter(({ id }) => id !== memberId)
    );
  }

  /** Removes the latest member when backspace is pressed on an empty search. */
  protected handleSearchKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Backspace' || this.searchTerm()) return;

    const lastMember = this.selectedMembers().at(-1);
    if (lastMember) this.removeSelectedMember(lastMember.id);
  }

  /** Checks whether a member is already selected. */
  private isMemberSelected(memberId: string): boolean {
    return this.selectedMembers().some(({ id }) => id === memberId);
  }
}
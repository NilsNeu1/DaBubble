import {
  Component,
  input,
  output,
} from '@angular/core';

type ChannelMemberStatus = 'online' | 'offline';

export interface ChannelMemberDropdownUser {
  uid: string;
  name: string;
  avatarUrl: string;
  status: ChannelMemberStatus;
}

@Component({
  selector: 'app-channel-members-dropdown',
  imports: [],
  templateUrl: './channel-members-dropdown.html',
  styleUrl: './channel-members-dropdown.scss',
})
export class ChannelMembersDropdown {
  /** Receives the members of the active channel. */
  public readonly members = input.required<ChannelMemberDropdownUser[]>();

  /** Emits when the dropdown should close. */
  public readonly closeRequested = output<void>();

  /** Emits when another member should be added. */
  public readonly addMemberRequested = output<void>();

  /** Emits the selected user ID for the profile dialog. */
  public readonly userProfileRequested = output<string>();

  /** Requests closing the members dropdown. */
  protected requestClose(): void {
    this.closeRequested.emit();
  }

  /** Requests opening the add-member view. */
  protected requestAddMember(): void {
    this.addMemberRequested.emit();
  }

  /** Requests the selected member profile. */
  protected requestUserProfile(userId: string): void {
    this.userProfileRequested.emit(userId);
  }
}
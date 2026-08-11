export type OnlineStatus = 'online' | 'offline' | 'away';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: OnlineStatus;
  isGuest: boolean;
  createdAt: number;
  channelMemberships?: {};
}

export const AVAILABLE_AVATARS: readonly string[] = [
  'assets/00.Charaters.png',
  'assets/01.Charaters.png',
  'assets/02.Charaters.png',
  'assets/03.Charaters.png',
  'assets/04.Charaters.png',
  'assets/05.Charaters.png',
];

export const DEFAULT_AVATAR = 'assets/default-user-avatar.png';

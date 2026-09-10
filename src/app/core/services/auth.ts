import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  confirmPasswordReset as fbConfirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  getAdditionalUserInfo,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { firebaseAuth, firestore } from '../firebase.config';
import { AppUser, AVAILABLE_AVATARS, DEFAULT_AVATAR } from '../models/user.model';
import { mapAuthError } from './auth-error';
import { ChatModel } from '../chat.model';
import { ChatMessagesService } from './chat-messages';
import { PresenceService } from './presence';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly chatModel = inject(ChatModel);
  private readonly chatMessages = inject(ChatMessagesService);
  private readonly presence = inject(PresenceService);
  private readonly router = inject(Router);

  readonly currentUser = signal<AppUser | null>(null);
  readonly allUsers = signal<AppUser[]>([]);
  readonly authReady = signal(false);
  readonly ready: Promise<void>;

  private unsubscribeCurrentUser?: Unsubscribe;
  private unsubscribeAllUsers?: Unsubscribe;

  constructor() {
    let resolveReady!: () => void;
    this.ready = new Promise((resolve) => (resolveReady = resolve));
    this.listenToPresenceStatusChanges();

    onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        await this.presence.stopPresence();
        this.unsubscribeCurrentUser?.();
        this.unsubscribeCurrentUser = undefined;
        this.unsubscribeAllUsers?.();
        this.unsubscribeAllUsers = undefined;
        this.chatModel.stopListening();
        this.currentUser.set(null);
        this.allUsers.set([]);
        if (this.router.url.startsWith('/messenger')) {
          await this.router.navigateByUrl('/login');
        }
        this.authReady.set(true);
        resolveReady();
        return;
      }
      const profile = await this.loadOrCreateProfile(firebaseUser);
      this.currentUser.set(profile);
      this.listenToCurrentUser(firebaseUser.uid);
      this.listenToAllUsers();
      await this.presence.startPresence(firebaseUser.uid);
      this.authReady.set(true);
      resolveReady();
    });
  }

  async register(name: string, email: string, password: string): Promise<void> {
    const previousUser = firebaseAuth.currentUser;
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(credential.user, { displayName: name });
      await this.saveProfile({
        uid: credential.user.uid,
        name,
        email,
        avatarUrl: DEFAULT_AVATAR,
        isGuest: false,
        createdAt: Date.now(),
      });
      await this.cleanupStaleAnonymousUser(previousUser);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async login(email: string, password: string): Promise<void> {
    const previousUser = firebaseAuth.currentUser;
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      this.currentUser.set(await this.loadOrCreateProfile(credential.user));
      await this.cleanupStaleAnonymousUser(previousUser);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async loginWithGoogle(): Promise<boolean> {
    const previousUser = firebaseAuth.currentUser;
    try {
      const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const existing = await getDoc(doc(firestore, 'users', credential.user.uid));
      const isNewUser = getAdditionalUserInfo(credential)?.isNewUser ?? !existing.exists();

      if (isNewUser || !existing.exists()) {
        await this.saveProfile({
          uid: credential.user.uid,
          name: credential.user.displayName ?? 'Unbenannt',
          email: credential.user.email ?? '',
          avatarUrl: DEFAULT_AVATAR,
          isGuest: false,
          createdAt: Date.now(),
        });

        await this.cleanupStaleAnonymousUser(previousUser);
        return true;
      }

      const profile = existing.data() as AppUser;
      this.currentUser.set(
        this.withPresenceStatus(profile, this.presence.getOnlineUserIds())
      );
      await this.cleanupStaleAnonymousUser(previousUser);
      return !AVAILABLE_AVATARS.includes(profile.avatarUrl);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async loginAsGuest(): Promise<void> {
    try {
      const credential = await signInAnonymously(firebaseAuth);
      this.currentUser.set(await this.loadOrCreateProfile(credential.user));
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async updateAvatar(avatarUrl: string): Promise<void> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('Es ist kein Benutzer angemeldet.');
    }
    try {
      await updateProfile(user, { photoURL: avatarUrl });
      await setDoc(doc(firestore, 'users', user.uid), { avatarUrl }, { merge: true });
      const profile = this.currentUser();
      if (profile) {
        this.currentUser.set({ ...profile, avatarUrl });
      }
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(firebaseAuth, email, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      });
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async confirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
    try {
      await fbConfirmPasswordReset(firebaseAuth, oobCode, newPassword);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async logout(): Promise<void> {
    const user = firebaseAuth.currentUser;
    await this.presence.stopPresence();
    if (user?.isAnonymous) {
      try {
        await this.chatMessages.deleteMessagesBySender(user.uid);
      } catch {
        // best-effort cleanup; the guest must still be signed out even if this fails
      }
      await deleteDoc(doc(firestore, 'users', user.uid));
      await deleteUser(user);
      return;
    }
    await signOut(firebaseAuth);
  }

  private async loadOrCreateProfile(firebaseUser: FirebaseUser): Promise<AppUser> {
    const ref = doc(firestore, 'users', firebaseUser.uid);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      return this.withPresenceStatus(
        {
          ...(snapshot.data() as AppUser),
          uid: firebaseUser.uid,
        },
        this.presence.getOnlineUserIds()
      );
    }
    const fallback: Omit<AppUser, 'status'> = {
      uid: firebaseUser.uid,
      name: firebaseUser.isAnonymous ? 'Gast' : firebaseUser.displayName ?? 'Unbenannt',
      email: firebaseUser.email ?? '',
      avatarUrl: firebaseUser.isAnonymous ? DEFAULT_AVATAR : firebaseUser.photoURL ?? DEFAULT_AVATAR,
      isGuest: firebaseUser.isAnonymous,
      createdAt: Date.now(),
    };
    await this.saveProfile(fallback);
    return this.withPresenceStatus(
      fallback,
      this.presence.getOnlineUserIds()
    );
  }

  private async saveProfile(user: Omit<AppUser, 'status'>): Promise<void> {
    await setDoc(doc(firestore, 'users', user.uid), user);
    this.currentUser.set(
      this.withPresenceStatus(user, this.presence.getOnlineUserIds())
    );
  }

  /** Removes a leftover anonymous guest account left behind by a new sign-in. */
  private async cleanupStaleAnonymousUser(previousUser: FirebaseUser | null): Promise<void> {
    if (!previousUser?.isAnonymous) return;
    try {
      await this.chatMessages.deleteMessagesBySender(previousUser.uid);
    } catch {
      // best-effort cleanup; ignore failures
    }
    try {
      await deleteDoc(doc(firestore, 'users', previousUser.uid));
    } catch {
      // best-effort cleanup; ignore failures
    }
    try {
      await deleteUser(previousUser);
    } catch {
      // best-effort cleanup; ignore failures
    }
  }

  /** Keeps loaded user statuses synchronized with Realtime Database presence. */
  private listenToPresenceStatusChanges(): void {
    effect(() => {
      const onlineUserIds = this.presence.getOnlineUserIds();
      untracked(() => {
        this.applyPresenceStatuses(onlineUserIds);
      });
    });
  }

  /** Applies the current presence state to all loaded user models. */
  private applyPresenceStatuses(onlineUserIds: ReadonlySet<string>): void {
    const currentUser = this.currentUser();
    if (currentUser) {
      this.currentUser.set(this.withPresenceStatus(currentUser, onlineUserIds));
    }
    this.allUsers.set(
      this.allUsers().map((user) => this.withPresenceStatus(user, onlineUserIds))
    );
  }

  /** Returns a user with the status derived from Realtime Database presence. */
  private withPresenceStatus(
    user: Omit<AppUser, 'status'>,
    onlineUserIds: ReadonlySet<string>
  ): AppUser {
    return {
      ...user,
      status: onlineUserIds.has(user.uid) ? 'online' : 'offline',
    };
  }

  listenToAllUsers(): void {
    this.unsubscribeAllUsers?.();

    this.unsubscribeAllUsers = onSnapshot(
      collection(firestore, 'users'),
      (snapshot) => {
        const onlineUserIds = this.presence.getOnlineUserIds();
        const users: AppUser[] = snapshot.docs.map((userDoc) =>
          this.withPresenceStatus(
            {
              ...(userDoc.data() as AppUser),
              uid: userDoc.id,
            },
            onlineUserIds
          )
        );

        this.allUsers.set(users);
      },);
  }

  private listenToCurrentUser(userId: string): void {
    this.unsubscribeCurrentUser?.();

    this.unsubscribeCurrentUser = onSnapshot(
      doc(firestore, 'users', userId),
      (snapshot) => {
        if (!snapshot.exists()) {
          this.currentUser.set(null);
          return;
        }

        const user = this.withPresenceStatus(
          {
            ...(snapshot.data() as AppUser),
            uid: snapshot.id,
          },
          this.presence.getOnlineUserIds()
        );

        this.currentUser.set(user);
      },
    );
  }
}

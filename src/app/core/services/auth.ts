
import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import {
  User as FirebaseUser,
  UserCredential,
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

@Injectable({ providedIn: 'root' })
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

  /** Starts the presence observer and the Firebase authentication listener. */
  constructor() {
    let resolveReady!: () => void;
    this.ready = new Promise((resolve) => (resolveReady = resolve));
    this.listenToPresenceStatusChanges();
    onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      await this.handleAuthStateChanged(firebaseUser, resolveReady);
    });
  }

  /** Handles a Firebase authentication change before marking the service ready. */
  private async handleAuthStateChanged(firebaseUser: FirebaseUser | null, resolveReady: () => void): Promise<void> {
    if (!firebaseUser) {
      await this.handleSignedOut();
      this.authReady.set(true);
      resolveReady();
      return;
    }
    await this.handleSignedIn(firebaseUser);
    this.authReady.set(true);
    resolveReady();
  }

  /** Stops user listeners, clears state and redirects after a sign-out. */
  private async handleSignedOut(): Promise<void> {
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
  }

  /** Loads the signed-in profile and starts its Firestore and presence observers. */
  private async handleSignedIn(firebaseUser: FirebaseUser): Promise<void> {
    const profile = await this.loadOrCreateProfile(firebaseUser);
    this.currentUser.set(profile);
    this.listenToCurrentUser(firebaseUser.uid);
    this.listenToAllUsers();
    await this.presence.startPresence(firebaseUser.uid);
  }

  /** Registers a user and removes the previous anonymous account if necessary. */
  async register(name: string, email: string, password: string): Promise<void> {
    const previousUser = firebaseAuth.currentUser;
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(credential.user, { displayName: name });
      await this.saveProfile(this.createRegistrationProfile(credential.user, name, email));
      await this.cleanupStaleAnonymousUser(previousUser);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  /** Creates the initial user profile for an email registration. */
  private createRegistrationProfile(user: FirebaseUser, name: string, email: string): Omit<AppUser, 'status'> {
    return {
      uid: user.uid,
      name,
      email,
      avatarUrl: DEFAULT_AVATAR,
      isGuest: false,
      createdAt: Date.now(),
    };
  }

  /** Signs in with email and password and cleans up a previous guest. */
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

  /** Signs in with Google and reports whether avatar selection is needed. */
  async loginWithGoogle(): Promise<boolean> {
    const previousUser = firebaseAuth.currentUser;
    try {
      const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const needsAvatar = await this.finishGoogleLogin(credential);
      await this.cleanupStaleAnonymousUser(previousUser);
      return needsAvatar;
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  /** Restores an existing Google profile or creates its first Firestore record. */
  private async finishGoogleLogin(credential: UserCredential): Promise<boolean> {
    const existing = await getDoc(doc(firestore, 'users', credential.user.uid));
    const isNewUser = getAdditionalUserInfo(credential)?.isNewUser ?? !existing.exists();
    if (isNewUser || !existing.exists()) {
      await this.saveProfile(this.createGoogleProfile(credential.user));
      return true;
    }
    const profile = existing.data() as AppUser;
    this.currentUser.set(this.withPresenceStatus(profile, this.presence.getOnlineUserIds()));
    return !AVAILABLE_AVATARS.includes(profile.avatarUrl);
  }

  /** Creates the default profile for a first-time Google sign-in. */
  private createGoogleProfile(user: FirebaseUser): Omit<AppUser, 'status'> {
    return {
      uid: user.uid,
      name: user.displayName ?? 'Unbenannt',
      email: user.email ?? '',
      avatarUrl: DEFAULT_AVATAR,
      isGuest: false,
      createdAt: Date.now(),
    };
  }

  /** Signs in anonymously and stores the resulting guest profile. */
  async loginAsGuest(): Promise<void> {
    try {
      const credential = await signInAnonymously(firebaseAuth);
      this.currentUser.set(await this.loadOrCreateProfile(credential.user));
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  /** Updates the signed-in user's avatar in Firebase Auth and Firestore. */
  async updateAvatar(avatarUrl: string): Promise<void> {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Es ist kein Benutzer angemeldet.');
    try {
      await updateProfile(user, { photoURL: avatarUrl });
      await setDoc(doc(firestore, 'users', user.uid), { avatarUrl }, { merge: true });
      this.setCurrentUserAvatar(avatarUrl);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  /** Synchronizes the avatar change with the currently loaded user. */
  private setCurrentUserAvatar(avatarUrl: string): void {
    const profile = this.currentUser();
    if (profile) this.currentUser.set({ ...profile, avatarUrl });
  }

  /** Sends the existing password reset email with the configured return URL. */
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

  /** Confirms a password reset code using Firebase Auth. */
  async confirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
    try {
      await fbConfirmPasswordReset(firebaseAuth, oobCode, newPassword);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  /** Ends presence and either deletes a guest or signs out a regular user. */
  async logout(): Promise<void> {
    const user = firebaseAuth.currentUser;
    await this.presence.stopPresence();
    if (user?.isAnonymous) {
      await this.logoutAnonymousUser(user);
      return;
    }
    await signOut(firebaseAuth);
  }

  /** Deletes a guest's messages, profile and Firebase account on logout. */
  private async logoutAnonymousUser(user: FirebaseUser): Promise<void> {
    try {
      await this.chatMessages.deleteMessagesBySender(user.uid);
    } catch {
      // best-effort cleanup; the guest must still be signed out even if this fails
    }
    await deleteDoc(doc(firestore, 'users', user.uid));
    await deleteUser(user);
  }

  /** Loads an existing Firestore profile or saves a default one. */
  private async loadOrCreateProfile(firebaseUser: FirebaseUser): Promise<AppUser> {
    const snapshot = await getDoc(doc(firestore, 'users', firebaseUser.uid));
    if (snapshot.exists()) {
      return this.withPresenceStatus({
        ...(snapshot.data() as AppUser), uid: firebaseUser.uid,
      }, this.presence.getOnlineUserIds());
    }
    const fallback = this.createFallbackProfile(firebaseUser);
    await this.saveProfile(fallback);
    return this.withPresenceStatus(fallback, this.presence.getOnlineUserIds());
  }

  /** Builds the same default profile for a user without a Firestore record. */
  private createFallbackProfile(firebaseUser: FirebaseUser): Omit<AppUser, 'status'> {
    return {
      uid: firebaseUser.uid,
      name: firebaseUser.isAnonymous ? 'Gast' : firebaseUser.displayName ?? 'Unbenannt',
      email: firebaseUser.email ?? '',
      avatarUrl: firebaseUser.isAnonymous ? DEFAULT_AVATAR : firebaseUser.photoURL ?? DEFAULT_AVATAR,
      isGuest: firebaseUser.isAnonymous,
      createdAt: Date.now(),
    };
  }

  /** Persists a user profile and updates the current user state. */
  private async saveProfile(user: Omit<AppUser, 'status'>): Promise<void> {
    await setDoc(doc(firestore, 'users', user.uid), user);
    this.currentUser.set(this.withPresenceStatus(user, this.presence.getOnlineUserIds()));
  }

  /** Removes a leftover anonymous guest account after a new sign-in. */
  private async cleanupStaleAnonymousUser(previousUser: FirebaseUser | null): Promise<void> {
    if (!previousUser?.isAnonymous) return;
    await this.tryDeleteGuestMessages(previousUser.uid);
    await this.tryDeleteGuestDocument(previousUser.uid);
    await this.tryDeleteGuestAccount(previousUser);
  }

  /** Attempts best-effort removal of the previous guest's messages. */
  private async tryDeleteGuestMessages(uid: string): Promise<void> {
    try {
      await this.chatMessages.deleteMessagesBySender(uid);
    } catch {
      // best-effort cleanup; ignore failures
    }
  }

  /** Attempts best-effort removal of the previous guest's Firestore profile. */
  private async tryDeleteGuestDocument(uid: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'users', uid));
    } catch {
      // best-effort cleanup; ignore failures
    }
  }

  /** Attempts best-effort deletion of the previous anonymous account. */
  private async tryDeleteGuestAccount(user: FirebaseUser): Promise<void> {
    try {
      await deleteUser(user);
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
  private withPresenceStatus(user: Omit<AppUser, 'status'>, onlineUserIds: ReadonlySet<string>): AppUser {
    return { ...user, status: onlineUserIds.has(user.uid) ? 'online' : 'offline' };
  }

  /** Restarts the Firestore listener for all users. */
  listenToAllUsers(): void {
    this.unsubscribeAllUsers?.();
    this.unsubscribeAllUsers = onSnapshot(collection(firestore, 'users'), (snapshot) => {
      const onlineUserIds = this.presence.getOnlineUserIds();
      const users: AppUser[] = snapshot.docs.map((userDoc) =>
        this.withPresenceStatus({
          ...(userDoc.data() as AppUser), uid: userDoc.id,
        }, onlineUserIds)
      );
      this.allUsers.set(users);
    });
  }

  /** Restarts the Firestore listener for the signed-in user. */
  private listenToCurrentUser(userId: string): void {
    this.unsubscribeCurrentUser?.();
    this.unsubscribeCurrentUser = onSnapshot(doc(firestore, 'users', userId), (snapshot) => {
      if (!snapshot.exists()) {
        this.currentUser.set(null);
        return;
      }
      const user = this.withPresenceStatus({
        ...(snapshot.data() as AppUser), uid: snapshot.id,
      }, this.presence.getOnlineUserIds());
      this.currentUser.set(user);
    });
  }
}

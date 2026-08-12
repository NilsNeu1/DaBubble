import { Injectable, signal } from '@angular/core';
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  confirmPasswordReset as fbConfirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../firebase.config';
import { AppUser, DEFAULT_AVATAR } from '../models/user.model';
import { mapAuthError } from './auth-error';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  readonly currentUser = signal<AppUser | null>(null);
  readonly authReady = signal(false);
  readonly ready: Promise<void>;

  constructor() {
    let resolveReady!: () => void;
    this.ready = new Promise((resolve) => (resolveReady = resolve));

    onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        this.currentUser.set(null);
        this.authReady.set(true);
        resolveReady();
        return;
      }
      const profile = await this.loadOrCreateProfile(firebaseUser);
      this.currentUser.set(profile);
      this.authReady.set(true);
      resolveReady();
    });
  }

  async register(name: string, email: string, password: string): Promise<void> {
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(credential.user, { displayName: name });
      await this.saveProfile({
        uid: credential.user.uid,
        name,
        email,
        avatarUrl: DEFAULT_AVATAR,
        status: 'online',
        isGuest: false,
        createdAt: Date.now(),
      });
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const existing = await getDoc(doc(firestore, 'users', credential.user.uid));
      if (!existing.exists()) {
        await this.saveProfile({
          uid: credential.user.uid,
          name: credential.user.displayName ?? 'Unbenannt',
          email: credential.user.email ?? '',
          avatarUrl: credential.user.photoURL ?? DEFAULT_AVATAR,
          status: 'online',
          isGuest: false,
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }

  async loginAsGuest(): Promise<void> {
    try {
      const credential = await signInAnonymously(firebaseAuth);
      await this.saveProfile({
        uid: credential.user.uid,
        name: 'Gast',
        email: '',
        avatarUrl: DEFAULT_AVATAR,
        status: 'online',
        isGuest: true,
        createdAt: Date.now(),
      });
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
    if (user?.isAnonymous) {
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
      return snapshot.data() as AppUser;
    }
    const fallback: AppUser = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName ?? 'Unbenannt',
      email: firebaseUser.email ?? '',
      avatarUrl: firebaseUser.photoURL ?? DEFAULT_AVATAR,
      status: 'online',
      isGuest: firebaseUser.isAnonymous,
      createdAt: Date.now(),
    };
    await this.saveProfile(fallback);
    return fallback;
  }

  private async saveProfile(user: AppUser): Promise<void> {
    await setDoc(doc(firestore, 'users', user.uid), user);
    this.currentUser.set(user);
  }
}

import { Injectable, signal } from '@angular/core';
import {
    DatabaseReference,
    DataSnapshot,
    onDisconnect,
    onValue,
    push,
    ref,
    remove,
    set,
} from 'firebase/database';
import { realtimeDatabase } from '../firebase.config';

@Injectable({
    providedIn: 'root',
})
export class PresenceService {
    private readonly clientIdStorageKey = 'dabubblePresenceClientId';
    private readonly clientId = this.getOrCreateClientId();
    private activeConnection: DatabaseReference | null = null;
    private activeClient: DatabaseReference | null = null;
    private activeUserId: string | null = null;
    private unsubscribeConnectionState?: () => void;
    private unsubscribePresenceState?: () => void;
    private readonly onlineUserIds = signal<ReadonlySet<string>>(new Set());

    /** Starts presence tracking for the authenticated user. */
    async startPresence(userId: string): Promise<void> {
        if (this.activeUserId === userId) return;
        await this.stopPresence();
        this.activeUserId = userId;
        this.listenToPresenceState();
        this.listenToConnectionState(userId);
    }

    /** Stops presence tracking and removes the active browser client. */
    async stopPresence(): Promise<void> {
        this.stopConnectionStateListener();
        this.stopPresenceStateListener();
        this.activeUserId = null;
        this.onlineUserIds.set(new Set());
        await this.removeActiveClient();
    }

    /** Returns whether the given user currently has an active connection. */
    isUserOnline(userId: string): boolean {
        return this.onlineUserIds().has(userId);
    }

    /** Returns the user IDs that currently have an active presence connection. */
    getOnlineUserIds(): ReadonlySet<string> {
        return this.onlineUserIds();
    }

    /** Returns the persistent presence client ID for this browser. */
    private getOrCreateClientId(): string {
        const storedClientId = localStorage.getItem(this.clientIdStorageKey);
        if (storedClientId) {
            return storedClientId;
        }
        const clientId = crypto.randomUUID();
        localStorage.setItem(this.clientIdStorageKey, clientId);
        return clientId;
    }

    /** Listens for active presence clients of authenticated users. */
    private listenToPresenceState(): void {
        const presenceState = ref(realtimeDatabase, 'presence');
        this.unsubscribePresenceState = onValue(presenceState, (snapshot) => {
            this.updateOnlineUsers(snapshot);
        });
    }

    /** Updates the set of users that currently have active browser clients. */
    private updateOnlineUsers(snapshot: DataSnapshot): void {
        const onlineUserIds = new Set<string>();
        snapshot.forEach((userSnapshot) => {
            if (userSnapshot.key && userSnapshot.child('clients').exists()) {
                onlineUserIds.add(userSnapshot.key);
            }
        });
        this.onlineUserIds.set(onlineUserIds);
    }

    /** Stops listening for active presence clients. */
    private stopPresenceStateListener(): void {
        this.unsubscribePresenceState?.();
        this.unsubscribePresenceState = undefined;
    }

    /** Listens for changes to the Realtime Database connection state. */
    private listenToConnectionState(userId: string): void {
        const connectionState = ref(realtimeDatabase, '.info/connected');
        this.unsubscribeConnectionState = onValue(connectionState, (snapshot) => {
            void this.handleConnectionState(snapshot, userId);
        });
    }

    /** Handles changes to the Realtime Database connection state. */
    private async handleConnectionState(
        snapshot: DataSnapshot,
        userId: string
    ): Promise<void> {
        if (!snapshot.val()) {
            this.activeConnection = null;
            return;
        }
        if (this.activeUserId !== userId) return;
        await this.createPresenceConnection(userId);
    }

    /** Creates a unique connection inside the current browser client. */
    private async createPresenceConnection(userId: string): Promise<void> {
        const clientPath = `presence/${userId}/clients/${this.clientId}`;
        const client = ref(realtimeDatabase, clientPath);
        const connection = push(
            ref(realtimeDatabase, `${clientPath}/connections`)
        );
        this.activeClient = client;
        this.activeConnection = connection;
        await this.registerPresenceConnection(connection, userId);
    }

    /** Registers disconnect cleanup before publishing the presence connection. */
    private async registerPresenceConnection(
        connection: DatabaseReference,
        userId: string
    ): Promise<void> {
        await onDisconnect(connection).remove();
        if (
            this.activeUserId !== userId ||
            this.activeConnection !== connection
        ) {
            return;
        }
        await set(connection, true);
    }

    /** Stops listening for Realtime Database connection state changes. */
    private stopConnectionStateListener(): void {
        this.unsubscribeConnectionState?.();
        this.unsubscribeConnectionState = undefined;
    }

    /** Removes all presence connections belonging to the current browser client. */
    private async removeActiveClient(): Promise<void> {
        const client = this.activeClient;
        this.activeConnection = null;
        this.activeClient = null;
        if (!client) return;
        try {
            await remove(client);
        } catch { }
    }
}
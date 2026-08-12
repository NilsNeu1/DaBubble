/users                                     (Nutzer-Profile)
└── /{userId}
    ├── displayName                        Anzeigename
    ├── email
    ├── avatarUrl
    ├── status                             online/offline
    │
    ├── /channelMemberships                Welche Channels ist dieser User Mitglied von
    │   └── /{channelId}
    │       ├── channelId
    │       ├── role                       z.B. "admin" | "member"
    │       ├── joinedAt
    │       ├── lastReadAt                 für Ungelesen-Badges
    │       └── notifyLevel                Mute-Einstellung pro Channel: "all" | "mentions" | "none"
    │
    └── /notifications                     Persönlicher Benachrichtigungs-Feed
        └── /{notificationId}
            ├── type                       z.B. "mention" | "reaction" | "invite"
            ├── sourceId                   Channel- oder Chat-ID, aus der die Notification kommt
            ├── messageId
            ├── createdAt
            └── readAt

/channels                                  Öffentliche/Team-Channels
└── /{channelId}
    ├── name
    ├── description
    ├── visibility                         z.B. "public" | "private"
    ├── createdBy
    ├── createdAt
    ├── updatedAt
    ├── memberCount                        Cache, damit man die Mitgliederzahl nicht extra zählen muss
    ├── lastMessage                        Kurz-Vorschau der letzten Nachricht (Map), fürs Sidebar-Listing
    │
    ├── /members                           Wer ist Mitglied in diesem Channel
    │   └── /{userId}
    │       ├── userId
    │       ├── role
    │       ├── joinedAt
    │       └── lastReadAt
    │
    └── /messages                          Alle Nachrichten im Channel
        └── /{messageId}
            ├── text
            ├── type                       z.B. "text" | "system"
            ├── senderId
            ├── senderSnapshot             Name/Avatar zum Sendezeitpunkt "eingefroren" (Map)
            ├── attachments                Array von Datei-Infos (Storage-URL, Name, Typ, Größe)
            ├── reactions                  Map: { thumbsUp: [uid1, uid2], heart: [uid3] }
            ├── createdAt
            ├── updatedAt
            ├── deletedAt                  Soft-Delete statt echtem Löschen
            └── replyToMessageId           Für Thread-/Antwort-Funktion

/directChats                               Private 1:1-Chats
└── /{chatId}
    ├── participantIds                     Array mit genau 2 UIDs
    ├── participantState                   Map pro User: { lastReadAt, muted, archived }
    ├── createdAt
    ├── updatedAt
    ├── lastMessage                        Kurz-Vorschau, wie bei Channels
    │
    └── /messages                          Gleicher Aufbau wie Channel-Messages
        └── /{messageId}
            ├── text
            ├── type
            ├── senderId
            ├── senderSnapshot
            ├── attachments
            ├── reactions
            ├── createdAt
            ├── updatedAt
            ├── deletedAt
            └── replyToMessageId

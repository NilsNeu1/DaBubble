export interface ReactionUser {
  uid: string;
  name: string;
}

export interface Reaction {
  icon: string;
  reactedBy: ReactionUser[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImageUrl: string;
  timestamp: number;
  text: string;
  hasThread: boolean;
  lastReply?: string;
  reactions: Reaction[];
}
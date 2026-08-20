export interface Reaction {
  icon: string;
  count: number;
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
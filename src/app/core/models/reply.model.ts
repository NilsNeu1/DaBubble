import { Reaction } from './message.model';

export interface ThreadReply {
  id: string;
  senderId: string;
  senderName: string;
  senderImageUrl: string;
  timestamp: number;
  text: string;
  reactions: Reaction[];
}
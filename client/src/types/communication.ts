import type { UserSummary } from './auth';
export interface Conversation {
  otherUser: UserSummary | null;
  lastMessageAt: string | null; lastMessage: string; lastSender: string | null; unreadCount: number;
}
export interface Message {
  _id: string; sender: UserSummary | null; receiver: UserSummary | null;
  text: string; read: boolean; readAt?: string | null; createdAt: string; updatedAt: string;
}
export interface Note {
  _id: string; title: string; content: string; subject?: string; author: string; tags: string[];
  userId?: UserSummary | null;
  sharedWith: { user: UserSummary | null; permission: 'read' | 'write'; sharedAt: string }[];
  isFavorite: boolean; createdAt: string; updatedAt: string;
}
export interface Notification {
  _id: string; title: string; message: string; type: string; priority: string; category: string;
  read: boolean; createdAt: string; actionUrl?: string; actionLabel?: string;
  relatedAppointment?: string | { _id: string; topic?: string; startsAt: string } | null;
  relatedUser?: UserSummary | null;
  userResponse?: string; respondedAt?: string | null;
}

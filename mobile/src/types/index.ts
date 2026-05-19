export interface User {
  _id: string;
  name: string;
  userCode: string;
  avatarUrl?: string;
  phone?: string;
}

export interface PublicUser {
  _id: string;
  name: string;
  userCode: string;
  avatarUrl?: string;
}

export interface ChatListItem {
  _id: string;
  type: string;
  otherParticipant: PublicUser | null;
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: string;
  } | null;
  lastMessageAt: string | null;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  content: string;
  clientMessageId?: string;
  createdAt: string;
  status?: 'sending' | 'sent' | 'failed';
}

export type AuthStackParamList = {
  Phone: undefined;
  Otp: { phone: string; name: string };
};

export type MainStackParamList = {
  ChatList: undefined;
  NewChat: undefined;
  ChatRoom: { chatId: string; title: string };
};

export interface ChatUpdatedPayload {
  chatId: string;
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: string;
  } | null;
  lastMessageAt: string | null;
  chat?: ChatListItem | null;
}

export interface MessageDeletedPayload {
  chatId: string;
  messageId: string;
  lastMessage: ChatUpdatedPayload['lastMessage'];
  lastMessageAt: string | null;
  chat?: ChatListItem | null;
}

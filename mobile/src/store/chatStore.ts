import { create } from 'zustand';
import {
  ChatListItem,
  Message,
  ChatUpdatedPayload,
  MessageDeletedPayload,
} from '../types';

export type { ChatUpdatedPayload, MessageDeletedPayload };

interface ChatState {
  chats: ChatListItem[];
  unreadByChatId: Record<string, boolean>;
  activeChatId: string | null;
  setChats: (chats: ChatListItem[]) => void;
  setActiveChatId: (chatId: string | null) => void;
  markChatRead: (chatId: string) => void;
  upsertChat: (chat: ChatListItem) => void;
  handleIncomingMessage: (message: Message, currentUserId: string) => void;
  handleChatUpdated: (payload: ChatUpdatedPayload, currentUserId: string) => void;
  handleChatNew: (chat: ChatListItem, currentUserId: string) => void;
  handleMessageDeleted: (payload: MessageDeletedPayload, currentUserId: string) => void;
  removeChat: (chatId: string) => void;
  reset: () => void;
}

function markUnread(
  unread: Record<string, boolean>,
  chatId: string,
  isFromOther: boolean,
  isViewingChat: boolean
): Record<string, boolean> {
  if (!isFromOther || isViewingChat) return unread;
  return { ...unread, [chatId]: true };
}

function upsertChatInList(chats: ChatListItem[], chat: ChatListItem): ChatListItem[] {
  const idx = chats.findIndex((c) => c._id === chat._id);
  if (idx >= 0) {
    const next = [...chats];
    next.splice(idx, 1);
    return [chat, ...next];
  }
  return [chat, ...chats];
}

function bumpChat(chats: ChatListItem[], chatId: string, patch: Partial<ChatListItem>): ChatListItem[] {
  const idx = chats.findIndex((c) => c._id === chatId);
  if (idx < 0) return chats;
  const updated = { ...chats[idx], ...patch };
  const next = [...chats];
  next.splice(idx, 1);
  next.unshift(updated);
  return next;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  unreadByChatId: {},
  activeChatId: null,

  setChats: (chats) => set({ chats }),

  setActiveChatId: (chatId) => {
    const unread = { ...get().unreadByChatId };
    if (chatId) delete unread[chatId];
    set({ activeChatId: chatId, unreadByChatId: unread });
  },

  markChatRead: (chatId) => {
    const unread = { ...get().unreadByChatId };
    delete unread[chatId];
    set({ unreadByChatId: unread });
  },

  upsertChat: (chat) => {
    set((state) => ({ chats: upsertChatInList(state.chats, chat) }));
  },

  handleChatNew: (chat, currentUserId) => {
    set((state) => ({
      chats: upsertChatInList(state.chats, chat),
    }));
  },

  handleIncomingMessage: (message, currentUserId) => {
    const { activeChatId, unreadByChatId, chats } = get();
    const isFromOther = message.senderId !== currentUserId;
    const isViewingChat = activeChatId === message.chatId;

    const patch = {
      lastMessage: {
        text: message.content,
        senderId: message.senderId,
        createdAt: message.createdAt,
      },
      lastMessageAt: message.createdAt,
    };

    const hasChat = chats.some((c) => c._id === message.chatId);

    set({
      unreadByChatId: markUnread(unreadByChatId, message.chatId, isFromOther, isViewingChat),
      chats: hasChat ? bumpChat(chats, message.chatId, patch) : chats,
    });
  },

  handleChatUpdated: (payload, currentUserId) => {
    const { activeChatId, unreadByChatId, chats } = get();
    const isFromOther = payload.lastMessage?.senderId !== currentUserId;
    const isViewingChat = activeChatId === payload.chatId;

    if (payload.chat) {
      set({
        unreadByChatId: markUnread(
          unreadByChatId,
          payload.chatId,
          !!isFromOther,
          isViewingChat
        ),
        chats: upsertChatInList(chats, payload.chat),
      });
      return;
    }

    const patch = {
      lastMessage: payload.lastMessage ?? undefined,
      lastMessageAt: payload.lastMessageAt,
    };

    set({
      unreadByChatId: markUnread(
        unreadByChatId,
        payload.chatId,
        !!isFromOther,
        isViewingChat
      ),
      chats: bumpChat(chats, payload.chatId, patch),
    });
  },

  handleMessageDeleted: (payload, currentUserId) => {
    const { chats } = get();
    if (payload.chat) {
      set({ chats: upsertChatInList(chats, payload.chat) });
      return;
    }
    set({
      chats: bumpChat(chats, payload.chatId, {
        lastMessage: payload.lastMessage,
        lastMessageAt: payload.lastMessageAt,
      }),
    });
  },

  removeChat: (chatId) => {
    const unread = { ...get().unreadByChatId };
    delete unread[chatId];
    set({
      chats: get().chats.filter((c) => c._id !== chatId),
      unreadByChatId: unread,
    });
  },

  reset: () => set({ chats: [], unreadByChatId: {}, activeChatId: null }),
}));

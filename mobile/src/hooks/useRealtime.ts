import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import {
  connectSocket,
  subscribeToChatUpdates,
  subscribeToMessages,
  subscribeToChatNew,
  subscribeToMessageDeleted,
  subscribeToChatHidden,
} from '../services/socket';

export function useRealtime() {
  const userId = useAuthStore((s) => s.user?._id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const handleIncomingMessage = useChatStore((s) => s.handleIncomingMessage);
  const handleChatUpdated = useChatStore((s) => s.handleChatUpdated);
  const handleChatNew = useChatStore((s) => s.handleChatNew);
  const handleMessageDeleted = useChatStore((s) => s.handleMessageDeleted);
  const removeChat = useChatStore((s) => s.removeChat);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    connectSocket().catch(() => {});

    const unsubMsg = subscribeToMessages((message) => {
      handleIncomingMessage(message, userId);
    });

    const unsubChat = subscribeToChatUpdates((payload) => {
      handleChatUpdated(payload, userId);
    });

    const unsubNew = subscribeToChatNew((chat) => {
      handleChatNew(chat, userId);
    });

    const unsubDel = subscribeToMessageDeleted((payload) => {
      handleMessageDeleted(payload, userId);
    });

    const unsubChatHidden = subscribeToChatHidden((chatId) => {
      removeChat(chatId);
    });

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        connectSocket().catch(() => {});
      }
    });

    return () => {
      unsubMsg();
      unsubChat();
      unsubNew();
      unsubDel();
      unsubChatHidden();
      sub.remove();
    };
  }, [
    isAuthenticated,
    userId,
    handleIncomingMessage,
    handleChatUpdated,
    handleChatNew,
    handleMessageDeleted,
    removeChat,
  ]);
}

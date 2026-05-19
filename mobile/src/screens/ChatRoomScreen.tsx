import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackParamList, Message } from '../types';
import { getMessages, sendMessageRest, deleteMessage } from '../services/chat';
import {
  connectSocket,
  joinChat,
  sendMessageSocket,
  subscribeToMessages,
  subscribeToMessageDeleted,
  subscribeToMessageHidden,
  onMessageError,
} from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

type Props = NativeStackScreenProps<MainStackParamList, 'ChatRoom'>;

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function ChatRoomScreen({ route, navigation }: Props) {
  const { chatId, title } = route.params;
  const userId = useAuthStore((s) => s.user?._id);
  const setActiveChatId = useChatStore((s) => s.setActiveChatId);
  const markChatRead = useChatStore((s) => s.markChatRead);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const mergeMessage = useCallback((incoming: Message) => {
    setMessages((prev) => {
      if (incoming.clientMessageId) {
        const idx = prev.findIndex((m) => m.clientMessageId === incoming.clientMessageId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...incoming, status: 'sent' };
          return next;
        }
      }
      if (prev.some((m) => m._id === incoming._id)) return prev;
      return [...prev, { ...incoming, status: 'sent' }];
    });
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  }, []);

  const loadHistory = useCallback(async (before?: string) => {
    const batch = await getMessages(chatId, { limit: 50, before });
    if (batch.length < 50) setHasMore(false);
    if (before) {
      setMessages((prev) => [...batch, ...prev]);
    } else {
      setMessages(batch.map((m) => ({ ...m, status: 'sent' as const })));
    }
  }, [chatId]);

  useFocusEffect(
    useCallback(() => {
      setActiveChatId(chatId);
      markChatRead(chatId);
      return () => setActiveChatId(null);
    }, [chatId, setActiveChatId, markChatRead])
  );

  useEffect(() => {
    let unsubMsg: (() => void) | undefined;
    let unsubDel: (() => void) | undefined;
    let unsubErr: (() => void) | undefined;

    (async () => {
      try {
        await loadHistory();
        await connectSocket();
        await joinChat(chatId);
      } catch {
        /* REST fallback on send */
      } finally {
        setLoading(false);
      }
    })();

    unsubMsg = subscribeToMessages((msg) => {
      if (msg.chatId === chatId) {
        mergeMessage(msg);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    unsubDel = subscribeToMessageDeleted((payload) => {
      if (payload.chatId === chatId) {
        removeMessage(payload.messageId);
      }
    });

    const unsubHidden = subscribeToMessageHidden((payload) => {
      if (payload.chatId === chatId) {
        removeMessage(payload.messageId);
      }
    });

    unsubErr = onMessageError(({ clientMessageId }) => {
      if (!clientMessageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, status: 'failed' } : m
        )
      );
    });

    return () => {
      unsubMsg?.();
      unsubDel?.();
      unsubHidden?.();
      unsubErr?.();
    };
  }, [chatId, loadHistory, mergeMessage, removeMessage]);

  const loadOlder = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      await loadHistory(messages[0].createdAt);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const clientMessageId = generateClientId();
    const optimistic: Message = {
      _id: clientMessageId,
      chatId,
      senderId: userId!,
      content: text,
      clientMessageId,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const sent = await sendMessageSocket(chatId, text, clientMessageId);
      mergeMessage(sent);
    } catch {
      try {
        const sent = await sendMessageRest(chatId, text, clientMessageId);
        mergeMessage(sent);
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === clientMessageId ? { ...m, status: 'failed' } : m
          )
        );
      }
    } finally {
      setSending(false);
    }
  };

  const retry = async (msg: Message) => {
    if (!msg.clientMessageId) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.clientMessageId === msg.clientMessageId ? { ...m, status: 'sending' } : m
      )
    );
    try {
      const sent = await sendMessageSocket(chatId, msg.content, msg.clientMessageId);
      mergeMessage(sent);
    } catch {
      try {
        const sent = await sendMessageRest(chatId, msg.content, msg.clientMessageId);
        mergeMessage(sent);
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === msg.clientMessageId ? { ...m, status: 'failed' } : m
          )
        );
      }
    }
  };

  const confirmDelete = (msg: Message) => {
    if (msg._id === msg.clientMessageId) return;

    const isMine = msg.senderId === userId;

    if (isMine) {
      Alert.alert('Delete message', 'Choose how to delete', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for me',
          onPress: () => handleDelete(msg, 'me'),
        },
        {
          text: 'Delete for everyone',
          style: 'destructive',
          onPress: () => handleDelete(msg, 'everyone'),
        },
      ]);
      return;
    }

    Alert.alert('Delete message', 'Remove this message from your chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete for me',
        style: 'destructive',
        onPress: () => handleDelete(msg, 'me'),
      },
    ]);
  };

  const handleDelete = async (msg: Message, scope: 'me' | 'everyone') => {
    setDeletingId(msg._id);
    try {
      await deleteMessage(chatId, msg._id, scope);
      removeMessage(msg._id);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete message');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.clientMessageId ?? item._id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          hasMore ? (
            <TouchableOpacity style={styles.loadMore} onPress={loadOlder} disabled={loadingMore}>
              {loadingMore ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text style={styles.loadMoreText}>Load older messages</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => {
          const isMine = item.senderId === userId;
          const canDelete = item._id !== item.clientMessageId && deletingId !== item._id;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onLongPress={() => canDelete && confirmDelete(item)}
              disabled={!canDelete}
              style={[styles.bubbleWrap, isMine ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}
            >
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.content}</Text>
                {item.status === 'failed' ? (
                  <TouchableOpacity onPress={() => retry(item)}>
                    <Text style={styles.retry}>Tap to retry</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message"
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, flexGrow: 1 },
  loadMore: { padding: 12, alignItems: 'center' },
  loadMoreText: { color: '#2563eb', fontSize: 14 },
  bubbleWrap: { marginVertical: 4, maxWidth: '80%' },
  bubbleWrapRight: { alignSelf: 'flex-end' },
  bubbleWrapLeft: { alignSelf: 'flex-start' },
  bubble: { borderRadius: 16, padding: 12 },
  bubbleMine: { backgroundColor: '#2563eb' },
  bubbleOther: { backgroundColor: '#fff' },
  bubbleText: { fontSize: 16, color: '#0f172a' },
  bubbleTextMine: { color: '#fff' },
  retry: { color: '#fecaca', fontSize: 12, marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600' },
});

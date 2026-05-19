import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackParamList } from '../types';
import { api } from '../services/api';
import { useChatStore } from '../store/chatStore';
import { getPublicDisplayName } from '../utils/displayName';

type Props = NativeStackScreenProps<MainStackParamList, 'ChatList'>;

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString() === new Date().toLocaleDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString();
}

export default function ChatListScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const chats = useChatStore((s) => s.chats);
  const unreadByChatId = useChatStore((s) => s.unreadByChatId);
  const setChats = useChatStore((s) => s.setChats);
  const markChatRead = useChatStore((s) => s.markChatRead);
  const removeChat = useChatStore((s) => s.removeChat);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await api.chats.list();
      setChats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setChats]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openChat = (item: (typeof chats)[0]) => {
    markChatRead(item._id);
    const title = getPublicDisplayName(item.otherParticipant);
    navigation.navigate('ChatRoom', { chatId: item._id, title });
  };

  const confirmDeleteChat = (item: (typeof chats)[0]) => {
    const name = getPublicDisplayName(item.otherParticipant);
    Alert.alert('Delete chat', `Remove "${name}" from your chat list? The other person will still have it.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete for me',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.chats.hide(item._id);
            removeChat(item._id);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete chat');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && chats.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        extraData={unreadByChatId}
        contentContainerStyle={chats.length === 0 ? styles.listEmpty : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No chats yet</Text>
            <Text style={styles.emptyHint}>Start a new conversation</Text>
          </View>
        }
        renderItem={({ item }) => {
          const hasUnread = !!unreadByChatId[item._id];
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => openChat(item)}
              onLongPress={() => confirmDeleteChat(item)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getPublicDisplayName(item.otherParticipant)[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={[styles.name, hasUnread && styles.nameUnread]}>
                    {getPublicDisplayName(item.otherParticipant)}
                  </Text>
                  <View style={styles.rowRight}>
                    <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
                    {hasUnread ? <View style={styles.unreadDot} /> : null}
                  </View>
                </View>
                <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
                  {item.lastMessage?.text ?? 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewChat')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 88 },
  listEmpty: { flexGrow: 1, paddingBottom: 88 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
  error: { color: '#dc2626', padding: 16 },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#334155' },
  emptyHint: { marginTop: 8, color: '#64748b' },
  row: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '600', color: '#2563eb' },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', color: '#0f172a', flex: 1 },
  nameUnread: { fontWeight: '700' },
  time: { fontSize: 12, color: '#94a3b8' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
    marginLeft: 6,
  },
  preview: { fontSize: 14, color: '#64748b' },
  previewUnread: { color: '#0f172a', fontWeight: '500' },
});

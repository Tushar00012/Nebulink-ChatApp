import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList, PublicUser } from '../types';
import { searchUsers, createChat } from '../services/chat';
import { getPublicDisplayName } from '../utils/displayName';

type Props = NativeStackScreenProps<MainStackParamList, 'NewChat'>;

export default function NewChatScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setUsers([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await searchUsers(text.trim());
      setUsers(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (user: PublicUser) => {
    setCreating(user._id);
    setError('');
    try {
      const chat = await createChat(user._id);
      const title = getPublicDisplayName(user);
      navigation.replace('ChatRoom', { chatId: chat._id, title });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start chat');
    } finally {
      setCreating(null);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search by user code"
        value={query}
        onChangeText={handleSearch}
        autoCapitalize="characters"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            query.length >= 2 ? (
              <Text style={styles.empty}>No users found</Text>
            ) : (
              <Text style={styles.empty}>Type at least 2 characters to search</Text>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => startChat(item)}
              disabled={creating === item._id}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.userCode}>{item.userCode}</Text>
              {creating === item._id ? <ActivityIndicator size="small" color="#2563eb" /> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  input: {
    margin: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  error: { color: '#dc2626', paddingHorizontal: 16 },
  loader: { marginTop: 24 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 24 },
  row: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  name: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  userCode: { fontSize: 14, color: '#64748b', marginTop: 4 },
});

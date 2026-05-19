import { apiRequest } from './api';
import { ChatListItem, Message, PublicUser } from '../types';

export async function searchUsers(q: string): Promise<PublicUser[]> {
  return apiRequest(`/users/search?q=${encodeURIComponent(q)}`);
}

export async function getChats(): Promise<ChatListItem[]> {
  return apiRequest('/chats');
}

export async function createChat(participantId: string): Promise<{ _id: string }> {
  return apiRequest('/chats', {
    method: 'POST',
    body: { participantId },
  });
}

export async function getMessages(
  chatId: string,
  params?: { limit?: number; before?: string }
): Promise<Message[]> {
  const search = new URLSearchParams();
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.before) search.set('before', params.before);
  const qs = search.toString();
  return apiRequest(`/chats/${chatId}/messages${qs ? `?${qs}` : ''}`);
}

export async function sendMessageRest(
  chatId: string,
  content: string,
  clientMessageId?: string
): Promise<Message> {
  return apiRequest(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: { content, clientMessageId },
  });
}

export async function deleteMessage(
  chatId: string,
  messageId: string,
  scope: 'me' | 'everyone'
): Promise<void> {
  await apiRequest(`/chats/${chatId}/messages/${messageId}?scope=${scope}`, {
    method: 'DELETE',
  });
}

export async function hideChat(chatId: string): Promise<void> {
  await apiRequest(`/chats/${chatId}`, {
    method: 'DELETE',
  });
}

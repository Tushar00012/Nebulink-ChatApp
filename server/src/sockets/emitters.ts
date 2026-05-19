import { Chat } from '../models/Chat';
import { IMessage } from '../models/Message';
import { serializeMessage } from '../utils/serializeMessage';
import { serializeChatListItem } from '../utils/serializeChat';
import { getIo } from './io';

export async function broadcastNewMessage(message: IMessage): Promise<void> {
  const io = getIo();
  const serialized = serializeMessage(message);
  const chatId = message.chatId.toString();

  io.to(`chat:${chatId}`).emit('message_new', { message: serialized });

  const chat = await Chat.findById(chatId).populate('participants', '_id');
  if (!chat) return;

  const lastMessage = {
    text: message.content,
    senderId: message.senderId.toString(),
    createdAt: message.createdAt.toISOString(),
  };

  for (const participant of chat.participants) {
    const userId = participant._id.toString();
    const chatItem = await serializeChatListItem(chatId, userId);
    if (!chatItem) continue;
    io.to(`user:${userId}`).emit('message_new', { message: serialized });
    io.to(`user:${userId}`).emit('chat_updated', {
      chatId,
      lastMessage,
      lastMessageAt: message.createdAt.toISOString(),
      chat: chatItem,
    });
  }
}

export async function broadcastChatCreated(chatId: string): Promise<void> {
  const io = getIo();
  const chat = await Chat.findById(chatId).populate('participants', '_id');
  if (!chat) return;

  for (const participant of chat.participants) {
    const userId = participant._id.toString();
    const chatItem = await serializeChatListItem(chatId, userId);
    if (chatItem) {
      io.to(`user:${userId}`).emit('chat_new', { chat: chatItem });
    }
  }
}

export async function broadcastChatHidden(userId: string, chatId: string): Promise<void> {
  const io = getIo();
  io.to(`user:${userId}`).emit('chat_hidden', { chatId });
}

export async function broadcastMessageHiddenForUser(
  userId: string,
  chatId: string,
  messageId: string
): Promise<void> {
  const io = getIo();
  io.to(`user:${userId}`).emit('message_hidden', { chatId, messageId });
}

export async function broadcastMessageDeleted(
  chatId: string,
  messageId: string
): Promise<void> {
  const io = getIo();
  const chat = await Chat.findById(chatId).populate('participants', '_id');
  if (!chat) return;

  const payload = {
    chatId,
    messageId,
    lastMessage: chat.lastMessage
      ? {
          text: chat.lastMessage.text,
          senderId: chat.lastMessage.senderId.toString(),
          createdAt: chat.lastMessage.createdAt.toISOString(),
        }
      : null,
    lastMessageAt: chat.lastMessageAt?.toISOString() ?? null,
  };

  io.to(`chat:${chatId}`).emit('message_deleted', payload);

  for (const participant of chat.participants) {
    const userId = participant._id.toString();
    const chatItem = await serializeChatListItem(chatId, userId);
    io.to(`user:${userId}`).emit('message_deleted', { ...payload, chat: chatItem });
  }
}

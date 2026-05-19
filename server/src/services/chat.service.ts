import { Types } from 'mongoose';
import { Chat, getParticipantKey } from '../models/Chat';
import { Message, IMessage } from '../models/Message';
import { User } from '../models/User';
import {
  broadcastNewMessage,
  broadcastChatCreated,
  broadcastMessageDeleted,
  broadcastChatHidden,
  broadcastMessageHiddenForUser,
} from '../sockets/emitters';
import { serializeMessage } from '../utils/serializeMessage';
import { visibleMessagesFilter } from '../utils/messageVisibility';

export { serializeMessage };

export class ChatError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

export async function assertParticipant(chatId: string, userId: string): Promise<void> {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ChatError('Chat not found', 404);
  }
  const isMember = chat.participants.some((p) => p.toString() === userId);
  if (!isMember) {
    throw new ChatError('Forbidden', 403);
  }
}

async function unhideChatForParticipants(chatId: string): Promise<void> {
  const chat = await Chat.findById(chatId);
  if (!chat) return;
  await Chat.findByIdAndUpdate(chatId, {
    $pull: { hiddenFor: { $in: chat.participants } },
  });
}

async function refreshChatLastMessage(chatId: string): Promise<void> {
  const latest = await Message.findOne({
    chatId,
    deletedForEveryone: { $ne: true },
  }).sort({ createdAt: -1 });

  if (latest) {
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: {
        text: latest.content,
        senderId: latest.senderId,
        createdAt: latest.createdAt,
      },
      lastMessageAt: latest.createdAt,
    });
  } else {
    await Chat.findByIdAndUpdate(chatId, {
      $unset: { lastMessage: 1 },
      lastMessageAt: null,
    });
  }
}

export async function hideChatForUser(chatId: string, userId: string): Promise<void> {
  await assertParticipant(chatId, userId);
  await Chat.findByIdAndUpdate(chatId, {
    $addToSet: { hiddenFor: new Types.ObjectId(userId) },
  });
  await broadcastChatHidden(userId, chatId);
}

export async function findOrCreateDirectChat(
  userId: string,
  participantId: string
): Promise<typeof Chat.prototype> {
  if (userId === participantId) {
    throw new ChatError('Cannot chat with yourself', 400);
  }
  const other = await User.findById(participantId);
  if (!other) {
    throw new ChatError('User not found', 404);
  }
  const participantKey = getParticipantKey(userId, participantId);
  let chat = await Chat.findOne({ participantKey });
  if (!chat) {
    chat = await Chat.create({
      type: 'direct',
      participants: [new Types.ObjectId(userId), new Types.ObjectId(participantId)],
      participantKey,
      hiddenFor: [],
    });
    await broadcastChatCreated(chat._id.toString());
  } else {
    await Chat.findByIdAndUpdate(chat._id, {
      $pull: {
        hiddenFor: {
          $in: [new Types.ObjectId(userId), new Types.ObjectId(participantId)],
        },
      },
    });
    chat = (await Chat.findById(chat._id))!;
  }
  return chat;
}

export async function deleteMessage(
  messageId: string,
  userId: string,
  scope: 'me' | 'everyone'
): Promise<void> {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new ChatError('Message not found', 404);
  }

  const chatId = message.chatId.toString();
  await assertParticipant(chatId, userId);

  if (scope === 'everyone') {
    if (message.senderId.toString() !== userId) {
      throw new ChatError('You can only delete your own messages for everyone', 403);
    }
    await Message.findByIdAndUpdate(messageId, {
      deletedForEveryone: true,
      content: 'This message was deleted',
    });
    await refreshChatLastMessage(chatId);
    await broadcastMessageDeleted(chatId, messageId);
    return;
  }

  await Message.findByIdAndUpdate(messageId, {
    $addToSet: { hiddenFor: new Types.ObjectId(userId) },
  });
  await broadcastMessageHiddenForUser(userId, chatId, messageId);
}

export interface CreateMessageInput {
  chatId: string;
  senderId: string;
  content: string;
  clientMessageId?: string;
}

export async function createMessage(input: CreateMessageInput): Promise<IMessage> {
  const { chatId, senderId, content, clientMessageId } = input;
  await assertParticipant(chatId, senderId);

  if (clientMessageId) {
    const existing = await Message.findOne({ chatId, clientMessageId });
    if (existing && !existing.deletedForEveryone) {
      const hidden = existing.hiddenFor?.some((id) => id.toString() === senderId);
      if (!hidden) {
        return existing;
      }
    }
  }

  await unhideChatForParticipants(chatId);

  const message = await Message.create({
    chatId,
    senderId,
    content: content.trim(),
    clientMessageId,
    hiddenFor: [],
    deletedForEveryone: false,
  });

  await Chat.findByIdAndUpdate(chatId, {
    lastMessage: {
      text: content.trim(),
      senderId: new Types.ObjectId(senderId),
      createdAt: message.createdAt,
    },
    lastMessageAt: message.createdAt,
  });

  await broadcastNewMessage(message);

  return message;
}

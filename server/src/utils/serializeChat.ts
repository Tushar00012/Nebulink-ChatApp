import { Types } from 'mongoose';
import { Chat } from '../models/Chat';
import { formatPublicUser } from './userResponse';

interface PopulatedParticipant {
  _id: Types.ObjectId;
  name: string;
  userCode: string;
  avatarUrl?: string;
}

export async function serializeChatListItem(chatId: string, forUserId: string) {
  const chat = await Chat.findById(chatId).populate(
    'participants',
    '_id name userCode avatarUrl'
  );
  if (!chat) return null;

  const isHidden = chat.hiddenFor?.some((id) => id.toString() === forUserId);
  if (isHidden) return null;

  const participants = chat.participants as unknown as PopulatedParticipant[];
  const other = participants.find((p) => p._id.toString() !== forUserId);

  return {
    _id: chat._id.toString(),
    type: chat.type,
    otherParticipant: other ? formatPublicUser(other) : null,
    lastMessage: chat.lastMessage
      ? {
          text: chat.lastMessage.text,
          senderId: chat.lastMessage.senderId.toString(),
          createdAt: chat.lastMessage.createdAt.toISOString(),
        }
      : null,
    lastMessageAt: chat.lastMessageAt?.toISOString() ?? null,
  };
}

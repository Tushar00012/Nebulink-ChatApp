import { IMessage } from '../models/Message';

export function serializeMessage(message: IMessage) {
  return {
    _id: message._id.toString(),
    chatId: message.chatId.toString(),
    senderId: message.senderId.toString(),
    content: message.content,
    clientMessageId: message.clientMessageId,
    createdAt: message.createdAt.toISOString(),
  };
}

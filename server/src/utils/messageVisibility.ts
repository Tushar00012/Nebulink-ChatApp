import { Types } from 'mongoose';

export function visibleMessagesFilter(chatId: string, userId: string, before?: string) {
  const filter: Record<string, unknown> = {
    chatId,
    deletedForEveryone: { $ne: true },
    hiddenFor: { $nin: [new Types.ObjectId(userId)] },
  };
  if (before) {
    filter.createdAt = { $lt: new Date(before) };
  }
  return filter;
}

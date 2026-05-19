import { Router, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  assertParticipant,
  findOrCreateDirectChat,
  createMessage,
  deleteMessage,
  hideChatForUser,
  serializeMessage,
  ChatError,
} from '../services/chat.service';
import { visibleMessagesFilter } from '../utils/messageVisibility';
import { formatPublicUser } from '../utils/userResponse';

const router = Router();
router.use(authMiddleware);

router.get('/users/search', async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string)?.trim() ?? '';
  if (q.length < 2) {
    res.json([]);
    return;
  }
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({
    _id: { $ne: req.user!.userId },
    userCode: regex,
  })
    .limit(20)
    .select('_id name userCode avatarUrl');
  res.json(users.map((u) => formatPublicUser(u)));
});

router.get('/chats', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const chats = await Chat.find({
    participants: userId,
    hiddenFor: { $nin: [new Types.ObjectId(userId)] },
  })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate('participants', '_id name userCode avatarUrl');

  const result = chats.map((chat) => {
    const other = (chat.participants as unknown as { _id: Types.ObjectId; name: string; userCode: string; avatarUrl?: string }[]).find(
      (p) => p._id.toString() !== userId
    );
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
  });

  res.json(result);
});

const createChatSchema = z.object({
  participantId: z.string().min(1),
});

router.post('/chats', async (req: AuthRequest, res: Response) => {
  const parsed = createChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'participantId required' });
    return;
  }
  try {
    const chat = await findOrCreateDirectChat(req.user!.userId, parsed.data.participantId);
    const populated = await Chat.findById(chat._id).populate(
      'participants',
      '_id name userCode avatarUrl'
    );
    const other = (populated!.participants as unknown as { _id: Types.ObjectId; name: string; userCode: string; avatarUrl?: string }[]).find(
      (p) => p._id.toString() !== req.user!.userId
    );
    res.status(201).json({
      _id: chat._id.toString(),
      type: chat.type,
      otherParticipant: other ? formatPublicUser(other) : null,
    });
  } catch (e) {
    if (e instanceof ChatError) {
      res.status(e.statusCode).json({ error: e.message });
      return;
    }
    throw e;
  }
});

router.get('/chats/:chatId/messages', async (req: AuthRequest, res: Response) => {
  const chatId = String(req.params.chatId);
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);
  const before = req.query.before as string | undefined;

  try {
    await assertParticipant(chatId, req.user!.userId);
  } catch (e) {
    if (e instanceof ChatError) {
      res.status(e.statusCode).json({ error: e.message });
      return;
    }
    throw e;
  }

  const messages = await Message.find(visibleMessagesFilter(chatId, req.user!.userId, before))
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json(messages.reverse().map(serializeMessage));
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  clientMessageId: z.string().optional(),
});

const deleteMessageSchema = z.object({
  scope: z.enum(['me', 'everyone']),
});

router.delete('/chats/:chatId', async (req: AuthRequest, res: Response) => {
  try {
    await hideChatForUser(String(req.params.chatId), req.user!.userId);
    res.json({ success: true });
  } catch (e) {
    if (e instanceof ChatError) {
      res.status(e.statusCode).json({ error: e.message });
      return;
    }
    throw e;
  }
});

router.delete('/chats/:chatId/messages/:messageId', async (req: AuthRequest, res: Response) => {
  const scopeInput = req.body?.scope ?? req.query.scope;
  const parsed = deleteMessageSchema.safeParse({ scope: scopeInput });
  if (!parsed.success) {
    res.status(400).json({ error: 'scope must be "me" or "everyone"' });
    return;
  }
  try {
    await deleteMessage(String(req.params.messageId), req.user!.userId, parsed.data.scope);
    res.json({ success: true, scope: parsed.data.scope });
  } catch (e) {
    if (e instanceof ChatError) {
      res.status(e.statusCode).json({ error: e.message });
      return;
    }
    throw e;
  }
});

router.post('/chats/:chatId/messages', async (req: AuthRequest, res: Response) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid message' });
    return;
  }
  try {
    const message = await createMessage({
      chatId: String(req.params.chatId),
      senderId: req.user!.userId,
      content: parsed.data.content,
      clientMessageId: parsed.data.clientMessageId,
    });
    res.status(201).json(serializeMessage(message));
  } catch (e) {
    if (e instanceof ChatError) {
      res.status(e.statusCode).json({ error: e.message });
      return;
    }
    throw e;
  }
});

export default router;

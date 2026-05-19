import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import {
  assertParticipant,
  createMessage,
  serializeMessage,
  ChatError,
} from '../services/chat.service';
import { setIo } from './io';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  setIo(io);

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }
    try {
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    socket.join(`user:${userId}`);

    socket.on('join_chat', async (payload: { chatId?: string }, ack?: (res: unknown) => void) => {
      const chatId = payload?.chatId;
      if (!chatId) {
        ack?.({ error: 'chatId required' });
        return;
      }
      try {
        await assertParticipant(chatId, userId);
        socket.join(`chat:${chatId}`);
        ack?.({ success: true });
      } catch (e) {
        const msg = e instanceof ChatError ? e.message : 'Failed to join';
        ack?.({ error: msg });
      }
    });

    socket.on(
      'send_message',
      async (
        payload: { chatId?: string; content?: string; clientMessageId?: string },
        ack?: (res: unknown) => void
      ) => {
        const { chatId, content, clientMessageId } = payload ?? {};
        if (!chatId || !content?.trim()) {
          ack?.({ error: 'chatId and content required' });
          return;
        }
        try {
          const message = await createMessage({
            chatId,
            senderId: userId,
            content,
            clientMessageId,
          });
          const serialized = serializeMessage(message);
          ack?.({ message: serialized });
        } catch (e) {
          const errorMsg = e instanceof ChatError ? e.message : 'Failed to send';
          socket.emit('message_error', { clientMessageId, error: errorMsg });
          ack?.({ error: errorMsg });
        }
      }
    );

    socket.on('typing_start', async (payload: { chatId?: string }) => {
      const chatId = payload?.chatId;
      if (!chatId) return;
      try {
        await assertParticipant(chatId, userId);
        socket.to(`chat:${chatId}`).emit('typing', { chatId, userId, isTyping: true });
      } catch {
        /* ignore */
      }
    });

    socket.on('typing_stop', async (payload: { chatId?: string }) => {
      const chatId = payload?.chatId;
      if (!chatId) return;
      try {
        await assertParticipant(chatId, userId);
        socket.to(`chat:${chatId}`).emit('typing', { chatId, userId, isTyping: false });
      } catch {
        /* ignore */
      }
    });
  });

  return io;
}

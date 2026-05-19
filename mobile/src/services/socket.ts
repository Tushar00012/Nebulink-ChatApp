import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config';
import { getToken } from './token';
import { Message, ChatListItem, ChatUpdatedPayload, MessageDeletedPayload } from '../types';

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

const messageHandlers = new Set<(message: Message) => void>();
const chatUpdateHandlers = new Set<(payload: ChatUpdatedPayload) => void>();
const chatNewHandlers = new Set<(chat: ChatListItem) => void>();
const messageDeletedHandlers = new Set<(payload: MessageDeletedPayload) => void>();
const chatHiddenHandlers = new Set<(chatId: string) => void>();
const messageHiddenHandlers = new Set<(payload: { chatId: string; messageId: string }) => void>();

function attachSocketListeners(s: Socket): void {
  s.off('message_new');
  s.off('chat_updated');
  s.off('chat_new');
  s.off('message_deleted');
  s.off('chat_hidden');
  s.off('message_hidden');

  s.on('message_new', (payload: { message: Message }) => {
    messageHandlers.forEach((h) => h(payload.message));
  });
  s.on('chat_updated', (payload: ChatUpdatedPayload) => {
    chatUpdateHandlers.forEach((h) => h(payload));
  });
  s.on('chat_new', (payload: { chat: ChatListItem }) => {
    chatNewHandlers.forEach((h) => h(payload.chat));
  });
  s.on('message_deleted', (payload: MessageDeletedPayload) => {
    messageDeletedHandlers.forEach((h) => h(payload));
  });
  s.on('chat_hidden', (payload: { chatId: string }) => {
    chatHiddenHandlers.forEach((h) => h(payload.chatId));
  });
  s.on('message_hidden', (payload: { chatId: string; messageId: string }) => {
    messageHiddenHandlers.forEach((h) => h(payload));
  });
}

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }
  if (connecting) {
    return connecting;
  }

  connecting = (async () => {
    const token = await getToken();
    if (!token) {
      throw new Error('No token');
    }

    if (socket) {
      socket.auth = { token };
      socket.connect();
    } else {
      socket = io(API_URL, {
        auth: { token },
        autoConnect: true,
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
      });
      attachSocketListeners(socket);
    }

    await new Promise<void>((resolve, reject) => {
      const s = socket!;
      if (s.connected) {
        resolve();
        return;
      }
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        s.off('connect', onConnect);
        s.off('connect_error', onError);
      };
      s.on('connect', onConnect);
      s.on('connect_error', onError);
    });

    return socket!;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  connecting = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  messageHandlers.clear();
  chatUpdateHandlers.clear();
  chatNewHandlers.clear();
  messageDeletedHandlers.clear();
  chatHiddenHandlers.clear();
  messageHiddenHandlers.clear();
}

export async function joinChat(chatId: string): Promise<void> {
  const s = await connectSocket();
  return new Promise((resolve, reject) => {
    s.emit('join_chat', { chatId }, (res: { error?: string; success?: boolean }) => {
      if (res?.error) reject(new Error(res.error));
      else resolve();
    });
  });
}

export async function sendMessageSocket(
  chatId: string,
  content: string,
  clientMessageId: string
): Promise<Message> {
  const s = await connectSocket();
  return new Promise((resolve, reject) => {
    s.emit(
      'send_message',
      { chatId, content, clientMessageId },
      (res: { error?: string; message?: Message }) => {
        if (res?.error) reject(new Error(res.error));
        else if (res?.message) resolve(res.message);
        else reject(new Error('Send failed'));
      }
    );
  });
}

export function subscribeToMessages(handler: (message: Message) => void): () => void {
  messageHandlers.add(handler);
  connectSocket().catch(() => {});
  return () => messageHandlers.delete(handler);
}

export function subscribeToChatUpdates(
  handler: (payload: ChatUpdatedPayload) => void
): () => void {
  chatUpdateHandlers.add(handler);
  connectSocket().catch(() => {});
  return () => chatUpdateHandlers.delete(handler);
}

export function subscribeToChatNew(handler: (chat: ChatListItem) => void): () => void {
  chatNewHandlers.add(handler);
  connectSocket().catch(() => {});
  return () => chatNewHandlers.delete(handler);
}

export function subscribeToMessageDeleted(
  handler: (payload: MessageDeletedPayload) => void
): () => void {
  messageDeletedHandlers.add(handler);
  connectSocket().catch(() => {});
  return () => messageDeletedHandlers.delete(handler);
}

export function subscribeToChatHidden(handler: (chatId: string) => void): () => void {
  chatHiddenHandlers.add(handler);
  connectSocket().catch(() => {});
  return () => chatHiddenHandlers.delete(handler);
}

export function subscribeToMessageHidden(
  handler: (payload: { chatId: string; messageId: string }) => void
): () => void {
  messageHiddenHandlers.add(handler);
  connectSocket().catch(() => {});
  return () => messageHiddenHandlers.delete(handler);
}

export function onMessageNew(handler: (message: Message) => void): () => void {
  return subscribeToMessages(handler);
}

export function onMessageError(
  handler: (payload: { clientMessageId?: string; error: string }) => void
): () => void {
  const s = getSocket();
  if (!s) {
    connectSocket()
      .then((sock) => {
        sock.on('message_error', handler);
      })
      .catch(() => {});
    return () => {};
  }
  s.on('message_error', handler);
  return () => s.off('message_error', handler);
}

import { Server } from 'socket.io';

let io: Server | null = null;

export function setIo(server: Server): void {
  io = server;
}

export function getIo(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

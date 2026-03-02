import { NextApiResponse } from 'next';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

export interface NextApiResponseWithSocket extends NextApiResponse {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
}
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'ws',
})
export class ScoreGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WebSocket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinMatch')
  handleJoinMatch(@MessageBody() data: { matchId: string }, @ConnectedSocket() client: Socket) {
    const room = `match:${data.matchId}`;
    client.join(room);
    console.log(`Client ${client.id} joined room ${room}`);
    return { status: 'joined', room };
  }

  @SubscribeMessage('leaveMatch')
  handleLeaveMatch(@MessageBody() data: { matchId: string }, @ConnectedSocket() client: Socket) {
    const room = `match:${data.matchId}`;
    client.leave(room);
    console.log(`Client ${client.id} left room ${room}`);
    return { status: 'left', room };
  }

  @SubscribeMessage('joinTournament')
  handleJoinTournament(@MessageBody() data: { tournamentId: string }, @ConnectedSocket() client: Socket) {
    const room = `tournament:${data.tournamentId}`;
    client.join(room);
    console.log(`Client ${client.id} joined room ${room}`);
    return { status: 'joined', room };
  }

  @SubscribeMessage('leaveTournament')
  handleLeaveTournament(@MessageBody() data: { tournamentId: string }, @ConnectedSocket() client: Socket) {
    const room = `tournament:${data.tournamentId}`;
    client.leave(room);
    console.log(`Client ${client.id} left room ${room}`);
    return { status: 'left', room };
  }

  /**
   * Broadcasts a live score update event to all clients in the corresponding rooms.
   */
  broadcastScoreUpdate(matchId: string, tournamentId: string, payload: any) {
    if (!this.server) return;
    this.server.to(`match:${matchId}`).emit('score.updated', payload);
    this.server.to(`tournament:${tournamentId}`).emit('score.updated', payload);
  }
}

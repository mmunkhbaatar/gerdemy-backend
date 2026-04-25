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
import { ChatService } from './chat.service';
import { FirebaseService } from '../auth/firebase.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Connected users map: userId -> socketId
  private connectedUsers = new Map<string, string>();

  constructor(
    private chatService: ChatService,
    private firebaseService: FirebaseService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) {
        client.disconnect();
        return;
      }
      const decoded = await this.firebaseService.verifyIdToken(token);
      const user = await this.prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
      });
      if (!user) {
        client.disconnect();
        return;
      }
      // Store userId on socket
      (client as any).userId = user.id;
      this.connectedUsers.set(user.id, client.id);
      console.log(`[Chat] User connected: ${user.displayName} (${user.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId as string;
    if (userId) {
      this.connectedUsers.delete(userId);
      console.log(`[Chat] User disconnected: ${userId}`);
    }
  }

  /** Channel-д нэгдэх (subscribe хийх) */
  @SubscribeMessage('joinChannel')
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    client.join(`channel:${data.channelId}`);
    return { event: 'joinedChannel', data: { channelId: data.channelId } };
  }

  /** Channel-аас гарах */
  @SubscribeMessage('leaveChannel')
  handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    client.leave(`channel:${data.channelId}`);
    return { event: 'leftChannel', data: { channelId: data.channelId } };
  }

  /** Мессеж илгээх */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; content: string },
  ) {
    const senderId = (client as any).userId as string;
    if (!senderId) return;

    const message = await this.chatService.saveMessage(
      data.channelId,
      senderId,
      data.content,
    );

    // Бүх channel гишүүдэд мессеж дамжуулах
    this.server.to(`channel:${data.channelId}`).emit('newMessage', message);

    // Unread тоог шинэчлэх мэдэгдэл
    this.server.to(`channel:${data.channelId}`).emit('channelUpdated', {
      channelId: data.channelId,
    });

    return message;
  }

  /** Typing indicator */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; isTyping: boolean },
  ) {
    const senderId = (client as any).userId as string;
    client.to(`channel:${data.channelId}`).emit('userTyping', {
      userId: senderId,
      isTyping: data.isTyping,
    });
  }
}

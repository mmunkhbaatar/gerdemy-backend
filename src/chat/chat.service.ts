import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Хоёр хэрэглэгчийн хоорондох суваг (channel) татах эсвэл шинээр үүсгэх.
   * Энэ нь "get or create" pattern ашиглана.
   */
  async getOrCreateChannel(userAId: string, userBId: string) {
    // Canonical order: A < B (always small id first to avoid duplicates)
    const [participantAId, participantBId] = [userAId, userBId].sort();

    let channel = await this.prisma.chatChannel.findFirst({
      where: { participantAId, participantBId },
      include: {
        participantA: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
        participantB: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
      },
    });

    if (!channel) {
      channel = await this.prisma.chatChannel.create({
        data: { participantAId, participantBId },
        include: {
          participantA: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
          participantB: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
        },
      });
    }

    return channel;
  }

  /**
   * Хэрэглэгчтэй холбоотой бүх чат сувгийн жагсаалт.
   * Хамгийн сүүлд ирсэн мессежтэй нь хамт буцаана.
   */
  async getMyChannels(userId: string) {
    const channels = await this.prisma.chatChannel.findMany({
      where: {
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      include: {
        participantA: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
        participantB: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, senderId: true, isRead: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return channels;
  }

  /**
   * Тухайн сувгийн мессежүүдийн жагсаалт (pagination-тай).
   */
  async getMessages(channelId: string, userId: string, page = 1, limit = 30) {
    // Security check: тухайн хэрэглэгч энэ сувагт хандах эрхтэй эсэхийг шалгана
    const channel = await this.prisma.chatChannel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Чат суваг олдсонгүй');
    if (channel.participantAId !== userId && channel.participantBId !== userId) {
      throw new ForbiddenException('Та энэ сувагт хандах эрхгүй');
    }

    const skip = (page - 1) * limit;
    const messages = await this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Уншаагүй мессежүүдийг уншсан болгох
    await this.prisma.message.updateMany({
      where: { channelId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    return messages.reverse();
  }

  /**
   * Шинэ мессеж хадгалах (Gateway-аас дуудагдана).
   */
  async saveMessage(channelId: string, senderId: string, content: string) {
    const channel = await this.prisma.chatChannel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Чат суваг олдсонгүй');
    if (channel.participantAId !== senderId && channel.participantBId !== senderId) {
      throw new ForbiddenException('Та энэ сувагт мессеж илгээх эрхгүй');
    }

    const message = await this.prisma.message.create({
      data: { channelId, senderId, content },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Channel-ийн updatedAt-г шинэчлэх (жагсаалт дахь эрэмбэлэлтэд зориулав)
    await this.prisma.chatChannel.update({
      where: { id: channelId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * Уншаагүй мессежийн тоо буцаах
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        channel: {
          OR: [{ participantAId: userId }, { participantBId: userId }],
        },
      },
    });
  }

  /**
   * Тусламж/Дэмжлэг (Support) чат суваг нээх.
   * Систем дэх хамгийн эхний идэвхтэй Админыг олоод түүнтэй чат суваг үүсгэнэ.
   */
  async getSupportChannel(userId: string) {
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    if (!admin) {
      throw new NotFoundException('Одоогоор идэвхтэй админ олдсонгүй. Дараа дахин оролдоно уу.');
    }

    return this.getOrCreateChannel(userId, admin.id);
  }

  /**
   * Firebase-ээс орж ирсэн мессежүүдийг Postgres рүү хуулах
   */
  async syncMessages(channelId: string, userId: string, messages: any[]) {
    const channel = await this.prisma.chatChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.participantAId !== userId && channel.participantBId !== userId) {
      throw new ForbiddenException('Not your channel');
    }

    // Skip duplicates if their ID is already in DB. Since Firestore IDs are strings, we can use them or let Prisma create new ones.
    // If Firebase messages use custom IDs, we should update the schema `id` to match Firebase document ID.
    // Assuming messages coming from client don't have UUIDs yet, we'll just insert what we don't have.
    // Wait, the client will send a unique ID or we generate it. Let's assume the request sends `{ id, content, senderId, createdAt }`
    
    for (const msg of messages) {
       await this.prisma.message.upsert({
         where: { id: msg.id },
         update: {},
         create: {
           id: msg.id,
           channelId: channelId,
           senderId: msg.senderId,
           content: msg.content,
           createdAt: new Date(msg.createdAt),
           isRead: msg.isRead || false,
         }
       });
    }

    return { success: true, synced: messages.length };
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Миний бүх чат сувгийн жагсаалт */
  @Get('channels')
  async getMyChannels(@Req() req: any) {
    return this.chatService.getMyChannels(req.user.id);
  }

  /** Тодорхой хэрэглэгчтэй чат суваг нээх/авах */
  @Post('channels/with/:targetUserId')
  async openChannel(@Req() req: any, @Param('targetUserId') targetUserId: string) {
    return this.chatService.getOrCreateChannel(req.user.id, targetUserId);
  }

  /** Тухайн сувгийн мессежүүд */
  @Get('channels/:channelId/messages')
  async getMessages(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Query('page') page: string,
  ) {
    return this.chatService.getMessages(channelId, req.user.id, Number(page) || 1);
  }

  /** Уншаагүй мессежийн тоо */
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.chatService.getUnreadCount(req.user.id);
    return { count };
  }

  /** Админтай (Support) чат нээх */
  @Post('support')
  async openSupportChannel(@Req() req: any) {
    return this.chatService.getSupportChannel(req.user.id);
  }

  /** Firebase-ээс орж ирсэн мессежүүдийг бааз руу хуулах */
  @Post('channels/:channelId/sync')
  async syncMessages(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Body('messages') messages: any[],
  ) {
    return this.chatService.syncMessages(channelId, req.user.id, messages);
  }
}

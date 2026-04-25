import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  async checkout(@Request() req, @Body() body: { bookingId: string, paymentMethod: string }) {
    return this.paymentsService.checkout(req.user.id, body.bookingId, body.paymentMethod);
  }

  @Get('history')
  async getHistory(@Request() req) {
    return this.paymentsService.getHistory(req.user.id);
  }
}

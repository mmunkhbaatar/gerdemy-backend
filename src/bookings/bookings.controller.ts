import { Controller, Post, Body, Get, Delete, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('bookings')
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async createBooking(@Request() req, @Body('slotId') slotId: string) {
    return this.bookingsService.createBooking(req.user.id, slotId);
  }

  @Get('my')
  async getMyBookings(@Request() req) {
    return this.bookingsService.getMyBookings(req.user.id);
  }

  @Delete(':id')
  async cancelBooking(@Request() req, @Param('id') id: string) {
    return this.bookingsService.cancelBooking(req.user.id, id);
  }

  @Patch(':id/attendance')
  async markAttendance(
    @Request() req,
    @Param('id') id: string,
    @Body('isAttended') isAttended: boolean,
  ) {
    return this.bookingsService.markAttendance(req.user.id, id, isAttended);
  }

  @Patch(':id/confirm-student')
  async confirmStudentAttendance(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.bookingsService.confirmStudentAttendance(req.user.id, id);
  }
}

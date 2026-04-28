import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN') // Зөвхөн ADMIN эрхтэй хүн дуудна
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard-stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.updateUserStatus(id, isActive);
  }

  @Patch('verify-mentor/:id')
  async verifyMentor(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED',
  ) {
    return this.adminService.verifyMentor(id, status);
  }

  @Get('bookings')
  async getAllBookings(@Query('mentorId') mentorId?: string) {
    return this.adminService.getAllBookings(mentorId);
  }

  @Delete('bookings/:id')
  async cancelBooking(@Param('id') id: string) {
    return this.adminService.adminCancelBooking(id);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('reports')
  async getReports() {
    return this.adminService.getReports();
  }
}

import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('mentor/:mentorId')
  async getMentorSlots(@Param('mentorId') mentorId: string) {
    return this.availabilityService.getMentorSlots(mentorId);
  }

  @Get('schedule/:mentorId')
  async getMentorSchedule(@Param('mentorId') mentorId: string) {
    return this.availabilityService.getMentorSchedule(mentorId);
  }

  @Post()
  async createSlot(@Body() data: { mentorId: string; startTime: string; endTime: string }) {
    return this.availabilityService.createSlot(data.mentorId, data.startTime, data.endTime);
  }

  @Delete(':id')
  async deleteSlot(@Param('id') id: string) {
    return this.availabilityService.deleteSlot(id);
  }
}

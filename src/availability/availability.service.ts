import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getMentorSlots(mentorId: string) {
    return this.prisma.availabilitySlot.findMany({
      where: {
        mentorId: mentorId,
        // isBooked filter-ийг хасав — UI дотор booked/available байдлаар ялгана
        startTime: {
          gt: new Date(),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async getMentorSchedule(mentorId: string) {
    return this.prisma.availabilitySlot.findMany({
      where: {
        mentorId: mentorId,
        startTime: {
          gt: new Date(),
        },
      },
      include: {
        bookings: {
          include: { student: { include: { user: true } } }
        }
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async createSlot(mentorId: string, startTime: string, endTime: string) {
    return this.prisma.availabilitySlot.create({
      data: {
        mentorId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });
  }

  async deleteSlot(id: string) {
    return this.prisma.availabilitySlot.delete({
      where: { id },
    });
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async createBooking(userId: string, slotId: string) {
    console.log(`[BookingsService] createBooking called: userId=${userId}, slotId=${slotId}`);

    if (!slotId) {
      throw new BadRequestException('slotId is required');
    }

    // 1. Check if slot is available
    const slot = await this.prisma.availabilitySlot.findUnique({
      where: { id: slotId },
      include: { mentor: true },
    });

    console.log(`[BookingsService] slot found:`, slot ? `id=${slot.id}, isBooked=${slot.isBooked}` : 'NOT FOUND');

    if (!slot) {
      throw new NotFoundException('Сонгосон цаг олдсонгүй (Slot not found)');
    }
    if (slot.isBooked) {
      throw new BadRequestException('Энэ цаг аль хэдийн захиалагдсан байна');
    }

    // 2. Ensure StudentProfile exists for the user
    let studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    console.log(`[BookingsService] studentProfile found:`, studentProfile ? studentProfile.id : 'NOT FOUND — will create');

    if (!studentProfile) {
      studentProfile = await this.prisma.studentProfile.create({
        data: { userId },
      });
      console.log(`[BookingsService] Created new studentProfile: ${studentProfile.id}`);
    }

    const finalStudentProfile = studentProfile;

    // 3. Create booking and mark slot as booked in transaction
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          studentId: finalStudentProfile.id,
          slotId: slot.id,
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
        include: {
          slot: {
            include: {
              mentor: {
                include: { user: true }
              }
            }
          }
        }
      });

      await tx.availabilitySlot.update({
        where: { id: slot.id },
        data: { isBooked: true },
      });

      console.log(`[BookingsService] Booking created successfully: ${booking.id}`);
      return booking;
    });
  }

  async getMyBookings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        mentorProfile: true,
        parentLinks: {
          where: { status: 'ACCEPTED' },
        }
      }
    });

    if (!user) return [];

    let whereClause: any = {};

    if (user.role === 'STUDENT' && user.studentProfile) {
      whereClause = { studentId: user.studentProfile.id };
    } else if (user.role === 'MENTOR' && user.mentorProfile) {
      whereClause = { slot: { mentorId: user.mentorProfile.id } };
    } else if (user.role === 'PARENT') {
      const childrenStudentIds = user.parentLinks.map(link => link.studentId);
      // Fetch the actual studentProfiles for these children
      const childrenProfiles = await this.prisma.studentProfile.findMany({
        where: { userId: { in: childrenStudentIds } }
      });
      const profileIds = childrenProfiles.map(p => p.id);
      
      console.log(`[BookingsService] PARENT query: childrenStudentIds=${childrenStudentIds}, profileIds=${profileIds}`);
      
      whereClause = { studentId: { in: profileIds } };
    } else if (user.role === 'ADMIN') {
      // Admin sees everything via this endpoint if needed, or we use standard
      whereClause = {};
    } else {
      return [];
    }

    return this.prisma.booking.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: true
          }
        },
        slot: {
          include: {
            mentor: {
              include: { user: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async cancelBooking(userId: string, bookingId: string) {
    // Find the booking and verify ownership
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { student: true },
    });

    if (!booking) {
      throw new NotFoundException('Захиалга олдсонгүй');
    }

    // Check that this booking belongs to the requesting user
    if (booking.student.userId !== userId) {
      throw new BadRequestException('Та зөвхөн өөрийн захиалгыг цуцлах боломжтой');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Захиалга аль хэдийн цуцлагдсан байна');
    }

    // Cancel booking and free up the slot in a transaction
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
        include: {
          slot: { include: { mentor: { include: { user: true } } } }
        },
      });

      // Free the slot so it can be booked again
      await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: { isBooked: false },
      });

      console.log(`[BookingsService] Booking ${bookingId} cancelled, slot freed.`);
      return updated;
    });
  }

  async markAttendance(mentorUserId: string, bookingId: string, isAttended: boolean) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { mentor: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.slot.mentor.userId !== mentorUserId) {
      throw new BadRequestException('You do not have permission to mark attendance for this booking');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { isAttended },
    });
  }

  async confirmStudentAttendance(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { student: true },
    });

    if (!booking) {
      throw new NotFoundException('Захиалга олдсонгүй');
    }

    if (booking.student.userId !== userId) {
      throw new BadRequestException('Танд энэ захиалгыг баталгаажуулах эрх байхгүй');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Цуцлагдсан захиалгыг баталгаажуулах боломжгүй');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { 
        isConfirmedByStudent: true,
        status: 'COMPLETED',
      },
    });
  }
}

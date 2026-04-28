import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, activeMentors, pendingRequests, revenueResult, totalBookings] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.mentorProfile.count({ where: { verificationStatus: 'APPROVED' } }),
      this.prisma.mentorProfile.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }),
      this.prisma.booking.count(),
    ]);

    const pendingMentors = await this.prisma.mentorProfile.findMany({
      where: { verificationStatus: 'PENDING' },
      include: {
        user: { select: { displayName: true, email: true, avatarUrl: true } }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    return {
      totalUsers,
      activeMentors,
      pendingRequests,
      totalBookings,
      revenue: Number(revenueResult._sum.amount ?? 0),
      pendingMentors,
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        mentorProfile: {
          select: { verificationStatus: true }
        }
      }
    });
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive }
    });
  }

  async verifyMentor(mentorId: string, status: 'APPROVED' | 'REJECTED') {
    return this.prisma.mentorProfile.update({
      where: { id: mentorId },
      data: { verificationStatus: status }
    });
  }

  async getReports() {
    // 1. Total transactions amount where status = PAID
    const transactions = await this.prisma.transaction.findMany({
      where: { status: 'PAID' },
    });
    const totalRevenue = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
    
    // 2. New signups
    const newSignups = await this.prisma.user.count();

    // 3. Top Mentors
    const topMentors = await this.prisma.mentorProfile.findMany({
      take: 3,
      orderBy: { hourlyRate: 'desc' },
      include: {
        user: { select: { displayName: true } }
      }
    });

    const formattedTopMentors = topMentors.map(m => ({
      name: m.user?.displayName || 'Үл мэдэгдэх',
      sessions: Math.floor(Math.random() * 50) + 10, // Mock sessions
      revenue: Number(m.hourlyRate) * 15 // Mock revenue
    }));

    // 4. Chart Data (7 days mock data for visualization)
    const chartData = [
      { day: 'Mon', value: 120000 },
      { day: 'Tue', value: 250000 },
      { day: 'Wed', value: 180000 },
      { day: 'Thu', value: Math.max(totalRevenue / 4, 300000) },
      { day: 'Fri', value: 450000 },
      { day: 'Sat', value: 150000 },
      { day: 'Sun', value: Math.max(totalRevenue / 2, 500000) },
    ];

    return {
      totalRevenue: totalRevenue || 12400000, // Fallback if 0 for UI purposes
      newSignups: newSignups,
      topMentors: formattedTopMentors.length > 0 ? formattedTopMentors : [
        { name: 'Б. Тэмүүлэн', sessions: 48, revenue: 2400000 },
        { name: 'А. Намуун', sessions: 32, revenue: 1800000 },
        { name: 'Г. Болд', sessions: 24, revenue: 1200000 },
      ],
      chartData: chartData
    };
  }

  async adminCancelBooking(bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new NotFoundException('Захиалга олдсонгүй');
      if (booking.status === 'CANCELLED') throw new BadRequestException('Захиалга аль хэдийн цуцлагдсан');

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
        include: {
          slot: { include: { mentor: { include: { user: true } } } },
          student: { include: { user: true } },
        },
      });

      await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: { isBooked: false },
      });

      return updated;
    });
  }

  async deleteUser(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Student-тай холбоотой bookings цэвэрлэх
      const student = await tx.studentProfile.findUnique({ where: { userId } });
      if (student) {
        const bookings = await tx.booking.findMany({ where: { studentId: student.id } });
        for (const b of bookings) {
          await tx.review.deleteMany({ where: { bookingId: b.id } });
          await tx.transaction.deleteMany({ where: { bookingId: b.id } });
          await tx.availabilitySlot.update({ where: { id: b.slotId }, data: { isBooked: false } });
        }
        await tx.booking.deleteMany({ where: { studentId: student.id } });
      }

      // 2. Mentor-тай холбоотой slot, booking цэвэрлэх
      const mentor = await tx.mentorProfile.findUnique({ where: { userId } });
      if (mentor) {
        const slots = await tx.availabilitySlot.findMany({ where: { mentorId: mentor.id } });
        for (const slot of slots) {
          const bookings = await tx.booking.findMany({ where: { slotId: slot.id } });
          for (const b of bookings) {
            await tx.review.deleteMany({ where: { bookingId: b.id } });
            await tx.transaction.deleteMany({ where: { bookingId: b.id } });
          }
          await tx.booking.deleteMany({ where: { slotId: slot.id } });
        }
      }

      // 3. Reviews (reviewer/reviewee)
      await tx.review.deleteMany({
        where: { OR: [{ reviewerId: userId }, { revieweeId: userId }] },
      });

      // 4. User-г устгах (cascade → profiles, slots, messages, channels гэх мэт)
      await tx.user.delete({ where: { id: userId } });
    });
  }

  async getAllBookings(mentorId?: string) {
    let whereClause: any = {};
    if (mentorId) {
      whereClause = {
        slot: { mentorId }
      };
    }

    return this.prisma.booking.findMany({
      where: whereClause,
      include: {
        student: {
          include: { user: true }
        },
        slot: {
          include: { mentor: { include: { user: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

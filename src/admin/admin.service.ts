import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, activeMentors, pendingRequests, transactions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.mentorProfile.count({ where: { verificationStatus: 'APPROVED' } }),
      this.prisma.mentorProfile.count({ where: { verificationStatus: 'PENDING' } }),
      // To prevent errors since Booking/Payment aren't fully populated yet:
      // We will mock revenue string for now or return 0
      Promise.resolve(0)
    ]);

    const pendingMentors = await this.prisma.mentorProfile.findMany({
      where: { verificationStatus: 'PENDING' },
      include: {
        user: {
          select: { displayName: true, email: true, avatarUrl: true }
        }
      },
      take: 5, // Just get latest 5 for dashboard
      orderBy: { createdAt: 'desc' }
    });

    return {
      totalUsers,
      activeMentors,
      pendingRequests,
      revenue: transactions, 
      pendingMentors
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

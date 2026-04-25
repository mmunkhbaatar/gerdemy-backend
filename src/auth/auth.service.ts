import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from './firebase.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  async loginOrRegister(idToken: string, role?: string) {
    let decodedToken;
    try {
      decodedToken = await this.firebaseService.verifyIdToken(idToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    const { uid, email, name, picture } = decodedToken;

    // Өгөгдлийн сангаас хэрэглэгчийг firebaseUid эсвэл email-ээр хайх
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: uid },
          { email: email },
        ],
      },
    });

    if (user && user.isActive === false) {
      throw new UnauthorizedException('Таны эрх хаагдсан байна. Админтай холбогдоно уу.');
    }

    if (user && user.firebaseUid !== uid) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid: uid },
      });
    }

    if (!user) {
      // Шинэ хэрэглэгч — role заавал байх ёстой
      const newRole = (role as any) || 'STUDENT';
      user = await this.prisma.user.create({
        data: {
          email: email || '',
          firebaseUid: uid,
          displayName: name,
          avatarUrl: picture,
          role: newRole,
        },
      });

      // Role-ээс хамааран Profile хүснэгтийг давхар үүсгэх
      if (newRole === 'STUDENT') {
        await this.prisma.studentProfile.create({
          data: { userId: user.id },
        });
      } else if (newRole === 'MENTOR') {
        await this.prisma.mentorProfile.create({
          data: {
            userId: user.id,
            university: 'Тохируулаагүй',
            major: 'Тохируулаагүй',
            country: 'Тохируулаагүй',
            hourlyRate: 0,
          },
        });
      }
    }
    // Байгаа хэрэглэгч нэвтэрч байгаа бол role-г өөрчилдөггүй

    return {
      message: 'Successfully authenticated',
      user: user,
    };
  }


  async getMe(idToken: string) {
    let decodedToken;
    try {
      decodedToken = await this.firebaseService.verifyIdToken(idToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    const { uid } = decodedToken;
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: {
        mentorProfile: true,
        studentProfile: true,
      }
    });

    if (!user) {
      throw new UnauthorizedException('User not found in database');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Таны эрх хаагдсан байна. Админтай холбогдоно уу.');
    }

    return user;
  }

  async getStats(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { userId } });
    if (!student) {
      return { hoursLearned: 0, mentorsCount: 0, messagesCount: 0 };
    }

    const completedBookings = await this.prisma.booking.findMany({
      where: { 
        studentId: student.id,
        status: { in: ['COMPLETED', 'CONFIRMED'] }
      },
      include: { slot: true }
    });

    let hoursLearned = 0;
    const uniqueMentors = new Set<string>();

    for (const b of completedBookings) {
      if (b.slot) {
        uniqueMentors.add(b.slot.mentorId);
        const durationMs = new Date(b.slot.endTime).getTime() - new Date(b.slot.startTime).getTime();
        hoursLearned += durationMs / (1000 * 60 * 60);
      }
    }

    return {
      hoursLearned: Math.round(hoursLearned * 10) / 10,
      mentorsCount: uniqueMentors.size,
      messagesCount: 0, // Placeholder
    };
  }

  async updateProfile(userId: string, data: {
    displayName?: string;
    avatarUrl?: string;
    highSchool?: string;
    targetCountry?: string;
    targetMajor?: string;
    university?: string;
    major?: string;
    country?: string;
    viberId?: string;
    whatsappId?: string;
    telegramId?: string;
  }) {
    // Update user fields
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        viberId: data.viberId,
        whatsappId: data.whatsappId,
        telegramId: data.telegramId,
      },
      include: {
        mentorProfile: true,
        studentProfile: true,
      }
    });

    if (updatedUser.role === 'STUDENT') {
      // Update or create student profile
      await this.prisma.studentProfile.upsert({
        where: { userId },
        update: {
          highSchool: data.highSchool,
          targetCountry: data.targetCountry,
          targetMajor: data.targetMajor,
        },
        create: {
          userId,
          highSchool: data.highSchool,
          targetCountry: data.targetCountry,
          targetMajor: data.targetMajor,
        },
      });
    } else if (updatedUser.role === 'MENTOR') {
      // Update mentor profile
      await this.prisma.mentorProfile.update({
        where: { userId },
        data: {
          university: data.university,
          major: data.major,
          country: data.country,
        },
      });
    }

    return updatedUser;
  }
}

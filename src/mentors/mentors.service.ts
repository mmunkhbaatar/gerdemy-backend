import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MentorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(featured?: boolean, category?: string, search?: string) {
    const where: any = { role: 'MENTOR' };
    
    if (featured !== undefined) {
      where.mentorProfile = { isFeatured: featured };
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { mentorProfile: { university: { contains: search, mode: 'insensitive' } } },
        { mentorProfile: { major: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        mentorProfile: true,
      },
    });

    const reviewsData = await this.prisma.review.groupBy({
      by: ['revieweeId'],
      _avg: { rating: true },
      _count: { id: true },
    });
    const reviewMap = new Map();
    reviewsData.forEach(r => reviewMap.set(r.revieweeId, r));

    let results = users
      .filter(user => user.mentorProfile !== null)
      .map(user => {
        const profile = user.mentorProfile!;
        const tags = this.getTags(profile);
        const reviewStats = reviewMap.get(user.id);
        
        return {
          id: profile.id,
          userId: user.id,
          name: user.displayName || 'Unknown Mentor',
          university: profile.university || 'University',
          major: profile.major || 'Major',
          country: profile.country || '',
          bio: profile.bio || '',
          rating: reviewStats?._avg?.rating || 5.0,
          reviews: reviewStats?._count?.id || 0,
          isFeatured: profile.isFeatured || false,
          hourlyRate: Number(profile.hourlyRate || 50000),
          tags: tags,
        };
      });

    if (category && category !== 'Бүгд') {
      results = results.filter(m => m.tags.includes(category) || m.major.toLowerCase().includes(category.toLowerCase()));
    }

    return results;
  }

  private getTags(profile: any): string[] {
    const tags = ['Mentorship', 'Advice'];
    const major = (profile.major || '').toLowerCase();
    const bio = (profile.bio || '').toLowerCase();

    if (major.includes('eng') || bio.includes('eng') || major.includes('инженер')) tags.push('Engineering');
    if (major.includes('computer') || major.includes('cs') || bio.includes('it') || major.includes('мэдээлэл')) tags.push('CS');
    if (major.includes('bus') || major.includes('econ') || major.includes('бизнес')) tags.push('Business');
    if (major.includes('sat') || bio.includes('sat')) tags.push('SAT');
    if (major.includes('essay') || bio.includes('эссэ')) tags.push('Эссэ');
    if (bio.includes('scholarship') || bio.includes('тэтгэлэг')) tags.push('Scholarship');

    return [...new Set(tags)];
  }

  async updateFeaturedStatus(mentorProfileId: string, isFeatured: boolean) {
    return this.prisma.mentorProfile.update({
      where: { id: mentorProfileId },
      data: { isFeatured },
    });
  }

  async getSavedMentors(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { userId } });
    if (!student) return [];

    const saved = await this.prisma.savedMentor.findMany({
      where: { studentId: student.id },
      include: {
        mentor: {
          include: { user: true }
        }
      }
    });

    const mentorIds = saved.map(s => s.mentor.userId);
    const reviewsData = mentorIds.length > 0 
      ? await this.prisma.review.groupBy({
          by: ['revieweeId'],
          where: { revieweeId: { in: mentorIds } },
          _avg: { rating: true },
          _count: { id: true },
        })
      : [];
    const reviewMap = new Map();
    reviewsData.forEach(r => reviewMap.set(r.revieweeId, r));

    return saved.map(s => {
      const reviewStats = reviewMap.get(s.mentor.userId);
      return {
        id: s.mentor.id,
        userId: s.mentor.userId,
        name: s.mentor.user?.displayName || 'Unknown Mentor',
        university: s.mentor.university,
        major: s.mentor.major,
        country: s.mentor.country,
        bio: s.mentor.bio,
        rating: reviewStats?._avg?.rating || 5.0,
        reviews: reviewStats?._count?.id || 0,
        hourlyRate: Number(s.mentor.hourlyRate),
        tags: ['Mentorship', 'Advice'],
      };
    });
  }

  async saveMentor(userId: string, mentorId: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { userId } });
    if (!student) throw new Error('Student profile not found');

    return this.prisma.savedMentor.create({
      data: {
        studentId: student.id,
        mentorId,
      }
    });
  }

  async unsaveMentor(userId: string, mentorId: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { userId } });
    if (!student) throw new Error('Student profile not found');

    return this.prisma.savedMentor.delete({
      where: {
        studentId_mentorId: {
          studentId: student.id,
          mentorId,
        }
      }
    });
  }

  async updateVerificationDocs(userId: string, data: { idCardUrl?: string; transcriptUrl?: string }) {
    return this.prisma.mentorProfile.update({
      where: { userId },
      data: {
        ...data,
        updatedAt: new Date(),
      }
    });
  }

  async submitVerification(userId: string) {
    return this.prisma.mentorProfile.update({
      where: { userId },
      data: {
        verificationStatus: 'PENDING',
        updatedAt: new Date(),
      }
    });
  }

  async getMentorProfile(userId: string) {
    return this.prisma.mentorProfile.findUnique({
      where: { userId },
    });
  }

  async getContacts(studentUserId: string, mentorUserId: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { userId: studentUserId } });
    if (!student) throw new Error('Student profile not found');

    const mentor = await this.prisma.mentorProfile.findUnique({ where: { userId: mentorUserId } });
    if (!mentor) throw new Error('Mentor profile not found');

    const hasConfirmedBooking = await this.prisma.booking.findFirst({
      where: {
        studentId: student.id,
        slot: { mentorId: mentor.id },
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      }
    });

    if (!hasConfirmedBooking) {
      throw new Error('Not authorized to view contacts');
    }

    return this.prisma.user.findUnique({
      where: { id: mentorUserId },
      select: { viberId: true, whatsappId: true, telegramId: true }
    });
  }
}

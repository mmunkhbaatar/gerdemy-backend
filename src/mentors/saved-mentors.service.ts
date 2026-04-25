import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedMentorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the student profile ID for a given Firebase UID.
   */
  private async getStudentProfileId(firebaseUid: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      include: { studentProfile: true },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found for this user.');
    }

    return user.studentProfile.id;
  }

  async getSavedMentors(firebaseUid: string) {
    const studentId = await this.getStudentProfileId(firebaseUid);

    return this.prisma.savedMentor.findMany({
      where: { studentId },
      include: {
        mentor: {
          include: {
            user: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async saveMentor(firebaseUid: string, mentorProfileId: string) {
    const studentId = await this.getStudentProfileId(firebaseUid);

    // Check if the mentor exists
    const mentor = await this.prisma.mentorProfile.findUnique({
      where: { id: mentorProfileId },
    });

    if (!mentor) {
      throw new NotFoundException('Mentor not found.');
    }

    // Check if already saved
    const existing = await this.prisma.savedMentor.findUnique({
      where: {
        studentId_mentorId: {
          studentId,
          mentorId: mentorProfileId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Mentor is already saved.');
    }

    return this.prisma.savedMentor.create({
      data: {
        studentId,
        mentorId: mentorProfileId,
      },
    });
  }

  async unsaveMentor(firebaseUid: string, mentorProfileId: string) {
    const studentId = await this.getStudentProfileId(firebaseUid);

    const existing = await this.prisma.savedMentor.findUnique({
      where: {
        studentId_mentorId: {
          studentId,
          mentorId: mentorProfileId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Mentor is not saved.');
    }

    return this.prisma.savedMentor.delete({
      where: {
        studentId_mentorId: {
          studentId,
          mentorId: mentorProfileId,
        },
      },
    });
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentsService {
  constructor(private prisma: PrismaService) {}

  async requestLink(parentId: string, studentEmail: string) {
    const student = await this.prisma.user.findUnique({
      where: { email: studentEmail },
    });

    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found or invalid user');
    }

    // Check if link already exists
    const existing = await this.prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId, studentId: student.id } },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new BadRequestException('Already linked to this student');
      } else if (existing.status === 'PENDING') {
        throw new BadRequestException('Link request already sent');
      }
      
      // If REJECTED previously, allow resending by updating to PENDING
      return this.prisma.parentStudentLink.update({
        where: { id: existing.id },
        data: { status: 'PENDING' },
      });
    }

    return this.prisma.parentStudentLink.create({
      data: {
        parentId,
        studentId: student.id,
      },
    });
  }

  async acceptRequest(studentId: string, linkId: string, accept: boolean) {
    const link = await this.prisma.parentStudentLink.findUnique({
      where: { id: linkId },
    });

    if (!link || link.studentId !== studentId) {
      throw new NotFoundException('Request not found');
    }

    if (link.status !== 'PENDING') {
      throw new BadRequestException('Request is no longer pending');
    }

    return this.prisma.parentStudentLink.update({
      where: { id: linkId },
      data: { status: accept ? 'ACCEPTED' : 'REJECTED' },
    });
  }

  async getMyChildren(parentId: string) {
    return this.prisma.parentStudentLink.findMany({
      where: { parentId, status: 'ACCEPTED' },
      include: {
        student: {
          include: { studentProfile: true }
        }
      }
    });
  }

  // For students — get PENDING link requests from parents
  async getPendingRequests(studentId: string) {
    return this.prisma.parentStudentLink.findMany({
      where: { studentId, status: 'PENDING' },
      include: {
        parent: {
          select: { id: true, displayName: true, email: true, avatarUrl: true }
        }
      }
    });
  }
}

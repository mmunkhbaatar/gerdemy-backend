import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(
    reviewerUserId: string,
    bookingId: string,
    rating: number,
    comment: string,
  ) {
    // Booking-ийг олох ба энэ хэрэглэгчид хамаарах эсэхийг шалгах
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { user: true } },
        slot: { include: { mentor: { include: { user: true } } } },
        review: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Захиалга олдсонгүй');
    }

    // STUDENT: өөрийн захиалга мөн эсэх
    // PARENT: хүүхдийнх нь захиалга мөн эсэх
    const studentUserId = booking.student.user.id;
    const isOwner = studentUserId === reviewerUserId;

    let isParentOfStudent = false;
    if (!isOwner) {
      const link = await this.prisma.parentStudentLink.findFirst({
        where: {
          parentId: reviewerUserId,
          studentId: studentUserId,
          status: 'ACCEPTED',
        },
      });
      isParentOfStudent = !!link;
    }

    if (!isOwner && !isParentOfStudent) {
      throw new ForbiddenException('Та энэ захиалгад сэтгэгдэл бичих эрхгүй байна');
    }

    // Нэг захиалгад нэгаас илүү сэтгэгдэл бичих хориглоно
    if (booking.review) {
      throw new ConflictException('Энэ захиалгад сэтгэгдэл аль хэдийн бичигдсэн байна');
    }

    const revieweeId = booking.slot.mentor.user.id;

    return this.prisma.review.create({
      data: {
        bookingId,
        reviewerId: reviewerUserId,
        revieweeId,
        rating,
        comment,
      },
      include: {
        reviewer: { select: { displayName: true, avatarUrl: true } },
      },
    });
  }

  async getReviewsForMentor(mentorUserId: string) {
    return this.prisma.review.findMany({
      where: { revieweeId: mentorUserId },
      include: {
        reviewer: { select: { displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllReviews() {
    return this.prisma.review.findMany({
      include: {
        reviewer: { select: { displayName: true, avatarUrl: true } },
        reviewee: { select: { displayName: true } },
        booking: {
          include: {
            slot: { include: { mentor: { include: { user: { select: { displayName: true } } } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Сэтгэгдэл олдсонгүй');
    }
    return this.prisma.review.delete({ where: { id: reviewId } });
  }
}

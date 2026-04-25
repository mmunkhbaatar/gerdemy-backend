import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async checkout(userId: string, bookingId: string, paymentMethod: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { mentor: true } } }
    });

    if (!booking) throw new NotFoundException('Захиалга олдсонгүй');
    if (booking.paymentStatus === 'PAID') throw new BadRequestException('Аль хэдийн төлбөр төлөгдсөн байна');

    return this.prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          bookingId: booking.id,
          amount: booking.slot.mentor.hourlyRate,
          currency: 'MNT',
          paymentMethod: paymentMethod,
          status: 'PAID',
        }
      });

      // Update booking
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED'
        }
      });

      return transaction;
    });
  }

  async getHistory(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { userId }});
    if (!student) return [];

    return this.prisma.transaction.findMany({
      where: { booking: { studentId: student.id } },
      include: {
        booking: {
          include: {
            slot: {
              include: {
                mentor: {
                  include: { user: true }
                }
              }
            }
          }
        }
      },
      orderBy: { transactionDate: 'desc' },
    });
  }
}

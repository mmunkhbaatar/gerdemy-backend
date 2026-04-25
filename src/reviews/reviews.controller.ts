import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('reviews')
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // STUDENT / PARENT: Сэтгэгдэл бичих
  @Post()
  async createReview(
    @Request() req,
    @Body('bookingId') bookingId: string,
    @Body('rating') rating: number,
    @Body('comment') comment: string,
  ) {
    return this.reviewsService.createReview(req.user.id, bookingId, rating, comment);
  }

  // Бүх хэрэглэгч: Тухайн менторын сэтгэгдлүүд
  @Get('mentor/:userId')
  async getMentorReviews(@Param('userId') userId: string) {
    return this.reviewsService.getReviewsForMentor(userId);
  }

  // ADMIN: Бүх сэтгэгдэл
  @Get()
  async getAllReviews(@Request() req) {
    if (req.user.role !== 'ADMIN') {
      return { message: 'Зөвхөн админ хэрэглэгч харах боломжтой' };
    }
    return this.reviewsService.getAllReviews();
  }

  // ADMIN: Сэтгэгдэл устгах
  @Delete(':id')
  async deleteReview(@Request() req, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') {
      return { message: 'Зөвхөн админ хэрэглэгч устгах боломжтой' };
    }
    return this.reviewsService.deleteReview(id);
  }
}

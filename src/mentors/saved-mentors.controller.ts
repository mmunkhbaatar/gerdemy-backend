import { Controller, Post, Delete, Get, Param, UseGuards, Req } from '@nestjs/common';
import { SavedMentorsService } from './saved-mentors.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('saved-mentors')
@UseGuards(AuthGuard)
export class SavedMentorsController {
  constructor(private readonly savedMentorsService: SavedMentorsService) {}

  /** Хэрэглэгчийн хадгалсан менторуудын жагсаалт */
  @Get()
  async getMySavedMentors(@Req() req: any) {
    return this.savedMentorsService.getSavedMentors(req.user.firebaseUid);
  }

  /** Ментор хадгалах */
  @Post(':mentorProfileId')
  async saveMentor(@Req() req: any, @Param('mentorProfileId') mentorProfileId: string) {
    return this.savedMentorsService.saveMentor(req.user.firebaseUid, mentorProfileId);
  }

  /** Хадгалсан менторыг хасах */
  @Delete(':mentorProfileId')
  async unsaveMentor(@Req() req: any, @Param('mentorProfileId') mentorProfileId: string) {
    return this.savedMentorsService.unsaveMentor(req.user.firebaseUid, mentorProfileId);
  }
}

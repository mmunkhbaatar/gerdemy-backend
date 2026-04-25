import { Module } from '@nestjs/common';
import { MentorsController } from './mentors.controller';
import { MentorsService } from './mentors.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from '../auth/auth.guard';
import { SavedMentorsController } from './saved-mentors.controller';
import { SavedMentorsService } from './saved-mentors.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MentorsController, SavedMentorsController],
  providers: [MentorsService, AuthGuard, SavedMentorsService],
})
export class MentorsModule {}

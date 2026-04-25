import { Controller, Get, Post, Delete, Param, UseGuards, Request, Query, Patch, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { MentorsService } from './mentors.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('mentors')
export class MentorsController {
  constructor(private readonly mentorsService: MentorsService) {}

  @Get()
  async findAll(
    @Query('featured') featured?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const isFeatured = featured === 'true' ? true : featured === 'false' ? false : undefined;
    return this.mentorsService.findAll(isFeatured, category, search);
  }

  @Patch(':id/featured')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateFeaturedStatus(
    @Param('id') id: string,
    @Body('isFeatured') isFeatured: boolean,
  ) {
    return this.mentorsService.updateFeaturedStatus(id, isFeatured);
  }

  @Get('saved')
  @UseGuards(AuthGuard)
  async getSavedMentors(@Request() req) {
    return this.mentorsService.getSavedMentors(req.user.id);
  }

  @Post(':id/save')
  @UseGuards(AuthGuard)
  async saveMentor(@Request() req, @Param('id') mentorId: string) {
    return this.mentorsService.saveMentor(req.user.id, mentorId);
  }

  @Delete(':id/unsave')
  @UseGuards(AuthGuard)
  async unsaveMentor(@Request() req, @Param('id') mentorId: string) {
    return this.mentorsService.unsaveMentor(req.user.id, mentorId);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req) {
    return this.mentorsService.getMentorProfile(req.user.id);
  }

  @Post('upload-verification')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/verification',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadVerificationDoc(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: 'id_card' | 'transcript',
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!type) throw new BadRequestException('Type is required (id_card or transcript)');

    const fileUrl = `/uploads/verification/${file.filename}`;
    const updateData = type === 'id_card' ? { idCardUrl: fileUrl } : { transcriptUrl: fileUrl };
    
    await this.mentorsService.updateVerificationDocs(req.user.id, updateData);
    
    return {
      url: fileUrl,
      type: type,
      filename: file.originalname,
    };
  }

  @Post('submit-verification')
  @UseGuards(AuthGuard)
  async submitVerification(@Request() req) {
    return this.mentorsService.submitVerification(req.user.id);
  }
  @Get(':id/contacts')
  @UseGuards(AuthGuard)
  async getContacts(@Request() req, @Param('id') mentorId: string) {
    try {
      return await this.mentorsService.getContacts(req.user.id, mentorId);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}

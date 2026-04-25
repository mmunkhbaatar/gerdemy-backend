import { Controller, Post, Body, HttpCode, HttpStatus, Headers, UnauthorizedException, Get, UseGuards, Request, Patch, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Headers('authorization') authHeader: string,
    @Body('role') role: any, // We will accept string and it will be validated in Prisma/Service
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    const idToken = authHeader.split('Bearer ')[1];
    return this.authService.loginOrRegister(idToken, role);
  }

  @Get('me')
  async getMe(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    const idToken = authHeader.split('Bearer ')[1];
    return this.authService.getMe(idToken);
  }

  @Get('me/stats')
  @UseGuards(AuthGuard)
  async getMyStats(@Request() req) {
    return this.authService.getStats(req.user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateMe(@Request() req, @Body() body: {
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
    return this.authService.updateProfile(req.user.id, body);
  }

  @Post('upload-avatar')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const fileUrl = `/uploads/avatars/${file.filename}`;
    // Optionally update profile directly here or wait for frontend to PATCH it.
    // Given the architecture, it's safer to update it immediately and return the URL.
    await this.authService.updateProfile(req.user.id, { avatarUrl: fileUrl });
    
    return {
      url: fileUrl,
      filename: file.originalname,
    };
  }
}

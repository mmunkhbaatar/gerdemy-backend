import { Controller, Post, Body, Get, UseGuards, Request, Patch, Param } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('parents')
@UseGuards(AuthGuard)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post('link-request')
  async requestLink(@Request() req, @Body('studentEmail') studentEmail: string) {
    return this.parentsService.requestLink(req.user.id, studentEmail);
  }

  @Patch('accept-request/:id')
  async acceptRequest(@Request() req, @Param('id') linkId: string, @Body('accept') accept: boolean) {
    return this.parentsService.acceptRequest(req.user.id, linkId, accept);
  }

  @Get('my-children')
  async getMyChildren(@Request() req) {
    return this.parentsService.getMyChildren(req.user.id);
  }

  @Get('pending-requests')
  async getPendingRequests(@Request() req) {
    return this.parentsService.getPendingRequests(req.user.id);
  }
}


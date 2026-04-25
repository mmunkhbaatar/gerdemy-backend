import { Module } from '@nestjs/common';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';
import { AuthModule } from '../auth/auth.module'; // Шинээр нэмсэн

@Module({
  imports: [AuthModule], // Шинээр нэмсэн
  controllers: [ParentsController],
  providers: [ParentsService],
  exports: [ParentsService],
})
export class ParentsModule {}

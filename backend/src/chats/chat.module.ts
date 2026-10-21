import { Module } from '@nestjs/common';
import { ChatsController } from './chat.controller';
import { ChatsService } from './chat.service';

@Module({
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
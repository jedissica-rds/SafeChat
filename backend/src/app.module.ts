import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { DatabaseController } from './database/database.controller';
import { UsersModule } from './users/user.module';
import { ChatsModule } from './chats/chat.module';

@Module({
  imports: [PrismaModule, UsersModule, ChatsModule],
  controllers: [AppController, DatabaseController],
  providers: [AppService],
})
export class AppModule {}
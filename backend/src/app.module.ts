import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { DatabaseController } from './database/database.controller';
import { UsersModule } from './users/user.module';
import { ChatsModule } from './chats/chat.module';
import { MessagesModule } from './messages/messages.module';

@Module({
 imports: [PrismaModule, UsersModule, ChatsModule, MessagesModule],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
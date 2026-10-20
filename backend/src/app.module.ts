import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DatabaseController } from './database/database.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, DatabaseController],
  providers: [AppService],
})
export class AppModule {}

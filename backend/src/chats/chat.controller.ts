import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../users/user.module';
import { ChatsService } from  './chat.service';
import { ChatRegisterDto } from './dtos/chat-register-dto';
import { ChatResponseDto } from './dtos/chat-response-dto';

type AuthRequest = Request & { user: { sub: string; username: string } };

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  @HttpCode(200)
  @ApiResponse({ status: 200, type: ChatResponseDto })
  create(@Req() req: AuthRequest, @Body() dto: ChatRegisterDto) {
    return this.chatsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiResponse({ status: 200, type: [ChatResponseDto] })
  list(@Req() req: AuthRequest) {
    return this.chatsService.list(req.user.sub);
  }
}
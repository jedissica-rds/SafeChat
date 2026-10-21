import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../users/user.module';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message-dto';
import { ListMessagesDto } from './dto/list-messages-dto';
import { UpdateStatusDto } from './dto/update-status-dto';
import { MessageResponseDto } from './dto/message-response-dto';

type AuthRequest = Request & { user: { sub: string; username: string } };

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(201)
  @ApiResponse({ status: 201, type: MessageResponseDto })
  send(@Req() req: AuthRequest, @Body() dto: SendMessageDto) {
    return this.messagesService.send(req.user.sub, dto);
  }

  @Get()
  @ApiResponse({ status: 200, type: [MessageResponseDto] })
  list(@Req() req: AuthRequest, @Query() query: ListMessagesDto) {
    return this.messagesService.list(req.user.sub, query);
  }

  @Patch(':id/status')
  @ApiResponse({ status: 200, type: MessageResponseDto })
  updateStatus(
    @Req() req: AuthRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.messagesService.updateStatus(req.user.sub, id, dto);
  }
}
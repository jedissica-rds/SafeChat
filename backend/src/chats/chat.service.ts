import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatRegisterDto } from './dtos/chat-register-dto'; 

const contactSelect = { id: true, username: true, name: true, publicKey: true } as const;

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(currentUserId: string, dto: ChatRegisterDto) {
    const other = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { id: true },
    });

    if (!other) {
      throw new NotFoundException({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    if (other.id === currentUserId) {
      throw new BadRequestException({
        status: 'error',
        code: 'CHAT_INVALID',
        message: 'Cannot create a chat with yourself',
      });
    }

    const [userAId, userBId] = [currentUserId, other.id].sort();

    const chat = await this.prisma.chat.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: {},
      create: { userAId, userBId },
      include: {
        userA: { select: contactSelect },
        userB: { select: contactSelect },
      },
    });

    return {
      status: 'ok',
      code: 'CHAT_READY',
      message: 'Chat ready',
      data: this.toResponse(chat, currentUserId),
    };
  }

  async list(currentUserId: string) {
    const chats = await this.prisma.chat.findMany({
      where: { OR: [{ userAId: currentUserId }, { userBId: currentUserId }] },
      include: {
        userA: { select: contactSelect },
        userB: { select: contactSelect },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 'ok',
      code: 'CHATS_LISTED',
      message: 'Chats retrieved',
      data: chats.map((c) => this.toResponse(c, currentUserId)),
    };
  }

  private toResponse(
    chat: {
      id: string;
      createdAt: Date;
      userAId: string;
      userA: { id: string; username: string; name: string, publicKey: string };
      userB: { id: string; username: string; name: string, publicKey: string };
    },
    currentUserId: string,
  ) {
    return {
      id: chat.id,
      createdAt: chat.createdAt,
      contact: chat.userAId === currentUserId ? chat.userB : chat.userA,
    };
  }
}
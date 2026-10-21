import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message-dto';
import { ListMessagesDto } from './dto/list-messages-dto';
import { UpdateStatusDto } from './dto/update-status-dto';

const messageSelect = {
  id: true,
  chatId: true,
  fromId: true,
  toId: true,
  wrappedSessionKeyFrom: true,
  wrappedSessionKeyTo: true,
  iv: true,
  ciphertext: true,
  hmac: true,
  seq: true,
  sentAt: true,
  status: true,
  lastSeq: true,
} as const;

const rank: Record<MessageStatus, number> = {
  stored: 0,
  delivered: 1,
  read: 2,
};

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getChatForUser(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    // mesma resposta para "não existe" e "não é seu": não revela chats alheios
    if (!chat || (chat.userAId !== userId && chat.userBId !== userId)) {
      throw new NotFoundException({
        status: 'error',
        code: 'CHAT_NOT_FOUND',
        message: 'Chat not found',
      });
    }
    return chat;
  }

  private async findDuplicate(id: string, userId: string) {
    const existing = await this.prisma.message.findUnique({
      where: { id },
      select: messageSelect,
    });
    if (!existing) return null;
    if (existing.fromId !== userId) {
      throw new ConflictException({
        status: 'error',
        code: 'MSG_FORMAT_INVALID',
        message: 'message id already in use',
      });
    }
    return {
      status: 'ok',
      code: 'MSG_DUPLICATE',
      message: 'Message already stored',
      data: existing,
    };
  }

  async send(userId: string, dto: SendMessageDto) {
    const chat = await this.getChatForUser(dto.chatId, userId);
    const toId = chat.userAId === userId ? chat.userBId : chat.userAId;

    const duplicate = await this.findDuplicate(dto.id, userId);
    if (duplicate) return duplicate;

    try {
      const message = await this.prisma.$transaction(async (tx) => {
        const { lastSeq } = await tx.chat.update({
          where: { id: chat.id },
          data: { lastSeq: { increment: 1 } },
          select: { lastSeq: true },
        });

        return tx.message.create({
          data: {
            id: dto.id,
            chatId: chat.id,
            fromId: userId,
            toId,
            wrappedSessionKeyFrom: dto.wrappedSessionKeyFrom,
            wrappedSessionKeyTo: dto.wrappedSessionKeyTo,
            iv: dto.iv,
            ciphertext: dto.ciphertext,
            hmac: dto.hmac,
            seq: lastSeq,
            sentAt: new Date(dto.sentAt),
          },
          select: messageSelect,
        });
      });

      return {
        status: 'ok',
        code: 'MSG_STORED',
        message: 'Message stored',
        data: message,
      };
    } catch (e) {
      // dois envios simultâneos com o mesmo id
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const dup = await this.findDuplicate(dto.id, userId);
        if (dup) return dup;
      }
      throw e;
    }
  }

  async list(userId: string, query: ListMessagesDto) {
    await this.getChatForUser(query.chatId, userId);

    const messages = await this.prisma.message.findMany({
      where: { chatId: query.chatId, seq: { gt: query.afterSeq ?? 0 } },
      orderBy: { seq: 'asc' },
      take: query.limit ?? 50,
      select: messageSelect,
    });

    return {
      status: 'ok',
      code: 'MESSAGES_LISTED',
      message: 'Messages retrieved',
      data: messages,
    };
  }

  async updateStatus(userId: string, id: string, dto: UpdateStatusDto) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      select: messageSelect,
    });

    // só o destinatário pode marcar como entregue/lida
    if (!message || message.toId !== userId) {
      throw new NotFoundException({
        status: 'error',
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found',
      });
    }

    const code = dto.status === 'read' ? 'MSG_READ' : 'MSG_DELIVERED';

    if (rank[dto.status] <= rank[message.status]) {
      return { status: 'ok', code, message: 'Status unchanged', data: message };
    }

    const updated = await this.prisma.message.update({
      where: { id },
      data: { status: dto.status },
      select: messageSelect,
    });

    return { status: 'ok', code, message: 'Status updated', data: updated };
  }
}
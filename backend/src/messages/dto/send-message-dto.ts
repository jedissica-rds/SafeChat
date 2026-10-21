import { ApiProperty } from '@nestjs/swagger';
import {
  IsBase64,
  IsISO8601,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'message_id gerado no cliente', example: '3f2b8c1e-8d7a-4c5b-9a1e-2b7d6f0c1a11' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Chat da conversa' })
  @IsUUID()
  chatId: string;

  @ApiProperty({ description: 'Session key cifrada com a chave pública do remetente', example: 'QUJDREVGRw==' })
  @IsString()
  @IsBase64()
  @MaxLength(1024)
  wrappedSessionKeyFrom: string;

  @ApiProperty({ description: 'Session key cifrada com a chave pública do destinatário', example: 'QUJDREVGRw==' })
  @IsString()
  @IsBase64()
  @MaxLength(1024)
  wrappedSessionKeyTo: string;

  @ApiProperty({ description: 'IV ', example: 'QUJDREVGRw==' })
  @IsString()
  @IsBase64()
  @MaxLength(64)
  iv: string;

  @ApiProperty({ description: 'Mensagem cifrada', example: 'QUJDREVGRw==' })
  @IsString()
  @IsBase64()
  @MaxLength(65536)
  ciphertext: string;

  @ApiProperty({ description: 'HMAC', example: 'QUJDREVGRw==' })
  @IsString()
  @IsBase64()
  @MaxLength(128)
  hmac: string;

  @ApiProperty({ description: 'Horário', example: '2026-10-20T22:30:00.000Z' })
  @IsISO8601()
  sentAt: string;
}
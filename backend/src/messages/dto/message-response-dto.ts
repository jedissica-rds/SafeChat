import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() chatId: string;
  @ApiProperty() fromId: string;
  @ApiProperty() toId: string;
  @ApiProperty() wrappedSessionKeyFrom: string;
  @ApiProperty() wrappedSessionKeyTo: string;
  @ApiProperty() iv: string;
  @ApiProperty() ciphertext: string;
  @ApiProperty() hmac: string;
  @ApiProperty() seq: number;
  @ApiProperty() sentAt: Date;
  @ApiProperty({ enum: ['stored', 'delivered', 'read'] }) status: string;
}
import { ApiProperty } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() username: string;
  @ApiProperty({ description: 'RSA public key (base64)' }) publicKey!: string;
}

export class ChatResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: ContactDto }) contact: ContactDto;
}
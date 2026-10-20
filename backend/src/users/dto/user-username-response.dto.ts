import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiProperty({ description: 'RSA public key (base64)' })
  publicKey!: string;
}
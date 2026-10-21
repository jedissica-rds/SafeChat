import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ description: 'Salt (base64) for Argon2id' })
  salt: string;

  @ApiProperty({ description: 'RSA public key (base64)' })
  publicKey: string;

  @ApiProperty({ description: 'RSA private key encrypted on the client (base64)' })
  encryptedPrivateKey: string;

  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: 'cd2798e7-c61b-47ec-9ef3-1053d0f4499e',
    description: 'Unique user identifier',
  })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ description: 'Salt (base64) for Argon2id' })
  salt: string;

  @ApiProperty({ description: 'RSA public key (base64)' })
  publicKey: string;

  @ApiProperty({
    description: 'RSA private key encrypted on the client (base64)',
  })
  encryptedPrivateKey: string;

  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;
}

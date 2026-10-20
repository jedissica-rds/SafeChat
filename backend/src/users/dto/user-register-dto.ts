import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsBase64,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

@Expose()
export class UserRegisterDto {
  @ApiProperty({
    description: "The user's name",
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: "The user's username (letters, numbers, . _ -)",
    example: 'johndoe',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'username may only contain letters, numbers, ".", "_" and "-"',
  })
  username: string;

  @ApiProperty({
    description: 'Random salt (base64) generated on the client for Argon2id',
    example: 'q83vEjRWeJq83vEjRWeJqw==',
  })
  @IsString()
  @IsBase64()
  @MaxLength(64)
  salt: string;

  @ApiProperty({
    description: 'RSA public key (base64, SPKI)',
    example: 'q83vEjRWeJq83vEjRWeJqw==',
  })
  @IsString()
  @IsBase64()
  @MaxLength(2048)
  publicKey: string;

  @ApiProperty({
    description:
      'RSA private key encrypted on the client (base64). The server never sees it in plain text.',
       example: 'q83vEjRWeJq83vEjRWeJqw==',
  })
  @IsString()
  @IsBase64()
  @MaxLength(8192)
  encryptedPrivateKey: string;

  @ApiProperty({
    description:
      'Authentication key derived on the client (HKDF subkey, base64). The server hashes it again before storing.',
       example: 'q83vEjRWeJq83vEjRWeJqw==',
  })
  @IsString()
  @IsBase64()
  @MaxLength(128)
  authKey: string;
}
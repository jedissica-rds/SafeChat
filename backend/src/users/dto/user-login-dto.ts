import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UserLoginDto {
  @ApiProperty({ description: "The user's username", example: 'johndoe' })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MaxLength(30)
  username!: string;

  @ApiProperty({
    description: 'Authentication key derived on the client (base64)',
    example: 'QUJDREVGRw==',
  })
  @IsString()
  @IsBase64()
  @MaxLength(128)
  authKey!: string;
}
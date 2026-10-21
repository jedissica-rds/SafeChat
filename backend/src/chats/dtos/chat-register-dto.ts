import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatRegisterDto {
  @ApiProperty({ description: 'Username of the other user', example: 'maria' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  username!: string;
}
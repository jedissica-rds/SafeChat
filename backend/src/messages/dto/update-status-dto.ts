import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ enum: ['delivered', 'read'] })
  @IsIn(['delivered', 'read'])
  status!: 'delivered' | 'read';
}
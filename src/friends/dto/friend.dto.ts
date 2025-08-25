import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveFriendDto {
  @ApiProperty({
    description: 'Friend user ID to remove',
    example: 'uuid-string',
  })
  @IsUUID()
  @IsNotEmpty()
  friendId: string;
}

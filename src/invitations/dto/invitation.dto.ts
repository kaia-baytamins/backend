import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Inviter LINE user ID (from invite link)',
    example: 'U1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  inviterLineUserId: string;

  @ApiProperty({
    description: 'Invitee LINE user ID',
    example: 'U9876543210fedcba9876543210fedcba',
  })
  @IsString()
  @IsNotEmpty()
  inviteeLineUserId: string;

  @ApiProperty({
    description: 'Invitee display name from LINE profile',
    required: false,
    example: 'Jane Doe',
  })
  @IsOptional()
  @IsString()
  inviteeDisplayName?: string;

  @ApiProperty({
    description: 'Invitee profile image URL from LINE',
    required: false,
    example: 'https://profile.line-scdn.net/...',
  })
  @IsOptional()
  @IsString()
  inviteeProfileImageUrl?: string;
}

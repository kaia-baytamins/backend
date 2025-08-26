import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SimpleLineLoginDto, SelectPetDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('simple-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simplified hackathon login',
    description:
      'Simple login that trusts frontend userProfile from useLiff.ts',
  })
  @ApiBody({ type: SimpleLineLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-string' },
            lineUserId: {
              type: 'string',
              example: 'U1234567890abcdef1234567890abcdef',
            },
            username: { type: 'string', example: 'John Doe' },
            avatar: {
              type: 'string',
              example: 'https://profile.line-scdn.net/...',
            },
            level: { type: 'number', example: 1 },
            experience: { type: 'number', example: 0 },
          },
        },
        isNewUser: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid user data' })
  async simpleLogin(@Body() loginDto: SimpleLineLoginDto) {
    return await this.authService.simpleLineLogin(loginDto);
  }

  @Public()
  @Post('select-pet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Select pet for new user',
    description: 'Select a pet after creating a new account',
  })
  @ApiBody({ type: SelectPetDto })
  @ApiResponse({
    status: 200,
    description: 'Pet selected successfully',
    schema: {
      properties: {
        id: { type: 'string', example: 'uuid-string' },
        name: { type: 'string', example: 'Momoco' },
        type: { type: 'string', example: 'momoco' },
        health: { type: 'number', example: 100 },
        level: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User already has a pet or user not found',
  })
  async selectPet(@Body() selectPetDto: SelectPetDto) {
    try {
      return await this.authService.selectPet(
        selectPetDto.lineUserId,
        selectPetDto.petType,
      );
    } catch (error) {
      console.error('Pet selection error:', error);
      throw error;
    }
  }
}

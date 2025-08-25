import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SimpleLineLoginDto } from './dto/auth.dto';
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
}

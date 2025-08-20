import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import {
  WalletLoginDto,
  NonceRequestDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get nonce for wallet authentication',
    description:
      'Generate a unique nonce that must be signed by the wallet for authentication',
  })
  @ApiBody({ type: NonceRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Nonce generated successfully',
    schema: {
      properties: {
        nonce: { type: 'string', example: 'a1b2c3d4e5f6...' },
        message: {
          type: 'string',
          example:
            'Please sign this message to authenticate with KAIA Game: a1b2c3d4e5f6...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid wallet address' })
  async generateNonce(@Body() nonceRequestDto: NonceRequestDto) {
    return await this.authService.generateNonce(nonceRequestDto);
  }

  @Public()
  @Post('wallet-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with wallet signature',
    description:
      'Authenticate user by verifying wallet signature and return JWT tokens',
  })
  @ApiBody({ type: WalletLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-string' },
            walletAddress: {
              type: 'string',
              example: '0x742C4f7C8e4C4e6f7A4a4a4a4a4a4a4a4a4a4a4a',
            },
            username: { type: 'string', example: 'SpaceExplorer' },
            level: { type: 'number', example: 1 },
            experience: { type: 'number', example: 0 },
            totalExplorations: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid signature or nonce' })
  async walletLogin(@Body() walletLoginDto: WalletLoginDto) {
    return await this.authService.walletLogin(walletLoginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Generate new access and refresh tokens using a valid refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto.refreshToken);
  }
}

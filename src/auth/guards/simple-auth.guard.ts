import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class SimpleAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // For hackathon: trust requests from configured frontend origins
    const origin = request.headers.origin;
    const allowedOrigins = this.configService.get('cors.origins');

    if (!allowedOrigins.includes(origin)) {
      throw new UnauthorizedException('Invalid origin');
    }

    // Get LINE user ID from headers (sent by frontend)
    const lineUserId = request.headers['x-line-user-id'];

    if (!lineUserId) {
      throw new UnauthorizedException('LINE user ID required');
    }

    // Get user from database
    const user = await this.authService.getUserByLineId(lineUserId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Attach user to request
    request.user = user;

    return true;
  }
}

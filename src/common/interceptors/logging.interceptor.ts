import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(
      `Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`,
    );

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = response;
        const contentLength = response.get('content-length') || 0;
        const endTime = Date.now();
        const duration = endTime - startTime;

        this.logger.log(
          `Outgoing Response: ${method} ${url} - Status: ${statusCode} - ${duration}ms - ${contentLength} bytes`,
        );
      }),
    );
  }
}

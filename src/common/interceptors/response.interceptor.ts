import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../responses/api-response.js';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((payload) => {
        if (
          response.statusCode === HttpStatus.NO_CONTENT ||
          payload === undefined
        ) {
          return payload;
        }

        if (ApiResponse.isEnvelope(payload)) {
          return payload;
        }

        if (ApiResponse.isMessageData(payload)) {
          return {
            status: true as const,
            message: payload.message,
            data: payload.data,
          };
        }

        return {
          status: true as const,
          message: 'Success',
          data: payload,
        };
      }),
    );
  }
}

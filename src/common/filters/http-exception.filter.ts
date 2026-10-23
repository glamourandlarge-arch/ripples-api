import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorBody = {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionBody =
      exception instanceof HttpException ? exception.getResponse() : null;

    const body: ErrorBody = {
      statusCode: status,
      message: readMessage(exceptionBody, status),
      error: readError(exceptionBody, status),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}

function readMessage(body: unknown, status: number): string | string[] {
  if (typeof body === 'string') {
    return body;
  }

  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === 'string')
    ) {
      return message;
    }
  }

  if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
    return 'Internal server error';
  }

  return HttpStatus[status] ?? 'Error';
}

function readError(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === 'string') {
      return error;
    }
  }

  return HttpStatus[status] ?? 'Error';
}

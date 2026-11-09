import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponse, type ErrorEnvelope } from '../responses/api-response.js';

const DEFAULT_UNAUTHORIZED_MESSAGE =
  'Access Denied! Please provide a valid token.';
const DEFAULT_NOT_FOUND_MESSAGE = 'The requested resource was not found';
const PRODUCTION_SERVER_ERROR_MESSAGE =
  'An Error Occurred, Please contact Support';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const isProduction = process.env.NODE_ENV === 'production';

    const { statusCode, body } = toErrorResult(exception, isProduction);

    response.status(statusCode).json(body);
  }
}

function toErrorResult(
  exception: unknown,
  isProduction: boolean,
): { statusCode: number; body: ErrorEnvelope } {
  if (!(exception instanceof HttpException)) {
    return ApiResponse.error(
      isProduction
        ? PRODUCTION_SERVER_ERROR_MESSAGE
        : exception instanceof Error
          ? exception.message
          : 'Internal server error',
      null,
      null,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const statusCode = exception.getStatus();
  const exceptionBody = exception.getResponse();
  const validationErrors = readValidationErrors(exceptionBody);

  if (validationErrors) {
    const firstMessage =
      Object.values(validationErrors)[0]?.[0] ?? 'Validation failed';
    return ApiResponse.error(
      firstMessage,
      validationErrors,
      [],
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  if (exception instanceof UnauthorizedException) {
    const message = readStringMessage(exceptionBody);
    return {
      statusCode: HttpStatus.UNAUTHORIZED,
      body: {
        status: false,
        message:
          !message || message === 'Unauthorized'
            ? DEFAULT_UNAUTHORIZED_MESSAGE
            : message,
        data: null,
        errors: null,
      },
    };
  }

  if (statusCode === HttpStatus.NOT_FOUND) {
    const message = readStringMessage(exceptionBody);
    return ApiResponse.error(
      !message || message === 'Not Found' || isFrameworkNotFoundMessage(message)
        ? DEFAULT_NOT_FOUND_MESSAGE
        : message,
      {},
      [],
      HttpStatus.NOT_FOUND,
    );
  }

  if (statusCode >= 500) {
    return ApiResponse.error(
      isProduction
        ? PRODUCTION_SERVER_ERROR_MESSAGE
        : (readStringMessage(exceptionBody) ?? 'Internal server error'),
      null,
      null,
      statusCode,
    );
  }

  return ApiResponse.error(
    readStringMessage(exceptionBody) ??
      (HttpStatus[statusCode] as string) ??
      'An error occurred',
    {},
    null,
    statusCode,
  );
}

function readStringMessage(body: unknown): string | null {
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
      message.length > 0 &&
      message.every((item) => typeof item === 'string')
    ) {
      return message[0] ?? null;
    }
  }

  return null;
}

function readValidationErrors(
  body: unknown,
): Record<string, string[]> | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const record = body as {
    message?: unknown;
    errors?: unknown;
    error?: unknown;
  };

  if (
    record.errors &&
    typeof record.errors === 'object' &&
    !Array.isArray(record.errors)
  ) {
    const mapped = mapFieldErrors(record.errors);
    if (Object.keys(mapped).length > 0) {
      return mapped;
    }
  }

  if (
    Array.isArray(record.message) &&
    record.message.every((item) => typeof item === 'string') &&
    (record.error === 'Bad Request' ||
      record.error === 'Unprocessable Entity' ||
      !('statusCode' in record) ||
      (body as { statusCode?: number }).statusCode ===
        HttpStatus.UNPROCESSABLE_ENTITY ||
      (body as { statusCode?: number }).statusCode === HttpStatus.BAD_REQUEST)
  ) {
    return messagesToFieldErrors(record.message as string[]);
  }

  return null;
}

function mapFieldErrors(errors: object): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(errors)) {
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      result[field] = value;
    } else if (typeof value === 'string') {
      result[field] = [value];
    }
  }
  return result;
}

function messagesToFieldErrors(messages: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const message of messages) {
    const field = guessField(message);
    result[field] ??= [];
    result[field].push(message);
  }

  return result;
}

function guessField(message: string): string {
  const match = /^(?:each value in )?([a-zA-Z0-9_.]+)\b/.exec(message);
  return match?.[1] ?? 'form';
}

function isFrameworkNotFoundMessage(message: string): boolean {
  return /^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /.test(message);
}

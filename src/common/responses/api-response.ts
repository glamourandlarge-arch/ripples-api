export type SuccessEnvelope<T> = {
  status: true;
  message: string;
  data: T;
};

export type ErrorEnvelope = {
  status: false;
  message: string;
  data: unknown;
  errors: Record<string, string[]> | null;
  error_code?: number;
};

export type ApiSuccessResult<T> = {
  statusCode: number;
  body: SuccessEnvelope<T>;
};

export type ApiErrorResult = {
  statusCode: number;
  body: ErrorEnvelope;
};

export class ApiResponse {
  static success<T>(
    data: T,
    message = 'Success',
    statusCode = 200,
  ): ApiSuccessResult<T> {
    return {
      statusCode,
      body: {
        status: true,
        message,
        data,
      },
    };
  }

  static error(
    message = 'An error occurred',
    errors: Record<string, string[]> | null = null,
    data: unknown = null,
    statusCode = 400,
  ): ApiErrorResult {
    const body: ErrorEnvelope = {
      status: false,
      message,
      data,
      errors,
    };

    if (statusCode >= 500) {
      body.error_code = statusCode;
    }

    return { statusCode, body };
  }

  static isEnvelope(value: unknown): value is SuccessEnvelope<unknown> | ErrorEnvelope {
    return (
      value !== null &&
      typeof value === 'object' &&
      'status' in value &&
      typeof (value as { status: unknown }).status === 'boolean' &&
      'message' in value &&
      typeof (value as { message: unknown }).message === 'string'
    );
  }

  static isMessageData(
    value: unknown,
  ): value is { message: string; data: unknown } {
    return (
      value !== null &&
      typeof value === 'object' &&
      'message' in value &&
      typeof (value as { message: unknown }).message === 'string' &&
      'data' in value &&
      !('status' in value)
    );
  }
}

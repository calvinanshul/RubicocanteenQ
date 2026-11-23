import type { ErrorCode } from '@/shared';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Standard error JSON response. */
export function errorResponse(status: number, code: ErrorCode, message: string, fields?: Record<string, string>): Response {
  return Response.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

/**
 * Converts any thrown value to the standard error JSON. Never leaks stack traces.
 * `log` receives unexpected errors (anything that isn't an AppError).
 */
export function toErrorResponse(err: unknown, log?: (err: unknown) => void): Response {
  if (err instanceof AppError) return errorResponse(err.status, err.code, err.message, err.fields);
  log?.(err);
  return errorResponse(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

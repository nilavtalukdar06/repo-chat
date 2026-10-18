type ApiErrorType = {
  statusCode: number;
  message: string;
  errors?: unknown[];
  cause?: unknown;
};

export class ApiError extends Error {
  readonly success = false;
  readonly statusCode: number;
  readonly message: string;
  readonly errors?: unknown[];
  readonly cause?: unknown;
  constructor(options: ApiErrorType) {
    super(options.message);
    this.statusCode = options.statusCode;
    this.message = options.message;
    this.errors = options?.errors ?? [];
    this.cause = options?.cause ?? undefined;

    Error.captureStackTrace(this, this.constructor);
  }
}

type ApiResponseType<T> = {
  statusCode: number;
  message: string;
  data?: T | undefined;
  meta?: Record<string, unknown> | undefined;
};

export class ApiResponse<T = unknown> {
  readonly success = true;
  readonly statusCode: number;
  readonly message: string;
  readonly data?: T | undefined;
  readonly meta?: Record<string, unknown> | undefined;
  constructor(options: ApiResponseType<T>) {
    this.statusCode = options.statusCode;
    this.message = options.message;
    this.data = options.data;
    this.meta = options.meta;
  }
}

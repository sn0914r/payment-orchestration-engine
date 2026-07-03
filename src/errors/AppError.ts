export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public errorCode: string,
    public errors: string[] | string | null = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

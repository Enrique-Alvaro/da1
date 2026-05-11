export class AppError extends Error {
  public readonly isOperational = true;

  constructor(
    public readonly error: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

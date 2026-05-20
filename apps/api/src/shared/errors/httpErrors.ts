import { AppError } from "./AppError";

export class BadRequestError extends AppError {
  constructor(message: string, code?: string) {
    super("BadRequestError", message, 400, code);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, code?: string) {
    super("UnauthorizedError", message, 401, code);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, code?: string) {
    super("ForbiddenError", message, 403, code);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code?: string) {
    super("NotFoundError", message, 404, code);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code?: string) {
    super("ConflictError", message, 409, code);
    this.name = "ConflictError";
  }
}

export class GoneError extends AppError {
  constructor(message: string) {
    super("GoneError", message, 410);
    this.name = "GoneError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("ValidationError", message, 422);
    this.name = "ValidationError";
  }
}

export class InternalServerError extends AppError {
  constructor(message: string) {
    super("InternalServerError", message, 500);
    this.name = "InternalServerError";
  }
}

export class NotImplementedError extends AppError {
  constructor(message: string) {
    super("NotImplementedError", message, 501);
    this.name = "NotImplementedError";
  }
}

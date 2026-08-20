/**
 * Domain errors. Server actions translate these into user-facing results;
 * anything else is treated as an unexpected fault and is not surfaced verbatim.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "You must be signed in to do that.") {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "You do not have permission to do that.") {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity = "Record") {
    super(`${entity} not found.`);
  }
}

export class ValidationError extends DomainError {}

export class InsufficientStockError extends DomainError {
  constructor(
    public readonly productName: string,
    public readonly available: number,
    public readonly requested: number
  ) {
    super(
      `Insufficient stock for ${productName}: ${available} available, ${requested} requested.`
    );
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

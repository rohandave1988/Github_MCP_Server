export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    const fullMessage = field ? `Validation failed for ${field}: ${message}` : message;
    super(fullMessage, 400);
  }
}

export class GitHubAPIError extends AppError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class RepositoryNotFoundError extends AppError {
  constructor(repoUrl: string) {
    super(`Repository not found: ${repoUrl}`, 404);
  }
}

export class PullRequestNotFoundError extends AppError {
  constructor(repoUrl: string, prNumber: number) {
    super(`Pull request #${prNumber} not found in ${repoUrl}`, 404);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 500, false);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function handleError(error: unknown): { message: string; statusCode: number } {
  if (isAppError(error)) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
    };
  }

  return {
    message: 'An unknown error occurred',
    statusCode: 500,
  };
}
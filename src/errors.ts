/**
 * Custom error types for the AI PR Review Action
 */

/**
 * Base error class for all custom errors
 */
export abstract class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when OpenRouter API authentication fails
 */
export class OpenRouterAuthError extends BaseError {
  constructor(message = 'OpenRouter API authentication failed') {
    super(message);
  }
}

/**
 * Error thrown when OpenRouter API rate limit is exceeded
 */
export class OpenRouterRateLimitError extends BaseError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    super(
      `OpenRouter API rate limit exceeded${
        retryAfter ? ` (retry after ${retryAfter}s)` : ''
      }`
    );
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when OpenRouter API request fails
 */
export class OpenRouterApiError extends BaseError {
  public readonly statusCode?: number;
  public readonly responseData?: unknown;

  constructor(message: string, statusCode?: number, responseData?: unknown) {
    super(
      `${message}${statusCode ? ` (HTTP ${statusCode})` : ''}${
        responseData ? ` - Response: ${JSON.stringify(responseData)}` : ''
      }`
    );
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}

/**
 * Error thrown when OpenRouter API request times out
 */
export class OpenRouterTimeoutError extends BaseError {
  constructor(public timeout: number) {
    super(`OpenRouter API request timed out after ${timeout}ms`);
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Error thrown when custom review rules are invalid
 */
export class InvalidCustomRulesError extends BaseError {
  public readonly filePath: string;

  constructor(message: string, filePath: string) {
    super(`${message} (file: ${filePath})`);
    this.filePath = filePath;
  }
}

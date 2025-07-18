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
  constructor(public retryAfter?: number) {
    super('OpenRouter API rate limit exceeded');
  }
}

/**
 * Error thrown when OpenRouter API request fails
 */
export class OpenRouterApiError extends BaseError {
  constructor(
    message: string,
    public statusCode?: number,
    public responseData?: unknown
  ) {
    super(message);
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
  constructor(message: string, public filePath: string) {
    super(message);
  }
}

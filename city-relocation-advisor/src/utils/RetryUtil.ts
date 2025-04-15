import { apiConfig } from '../config/api.config';
import { rateLimiter } from './RateLimiter';

export class RetryUtil {
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  constructor() {
    this.maxRetries = apiConfig.retry.maxRetries;
    this.baseDelay = apiConfig.retry.baseDelay;
    this.maxDelay = apiConfig.retry.maxDelay;
  }

  private calculateDelay(retryCount: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, retryCount);
    return Math.min(exponentialDelay, this.maxDelay);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;
    
    for (let retryCount = 0; retryCount <= this.maxRetries; retryCount++) {
      try {
        await rateLimiter.acquireToken();
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (retryCount === this.maxRetries || !shouldRetry(error)) {
          throw error;
        }

        const delay = this.calculateDelay(retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

// Create a singleton instance
export const retryUtil = new RetryUtil(); 
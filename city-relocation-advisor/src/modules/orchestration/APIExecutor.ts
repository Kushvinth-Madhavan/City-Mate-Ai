import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { Tool } from '../planner/SmartPlanner';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface TimeoutConfig {
  timeout: number;
  timeoutErrorMessage: string;
}

export class APIExecutor {
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  private defaultTimeoutConfig: TimeoutConfig = {
    timeout: 30000,
    timeoutErrorMessage: 'Request timed out'
  };

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoff(retryCount: number, config: RetryConfig): number {
    const delay = Math.min(
      config.initialDelay * Math.pow(config.backoffFactor, retryCount),
      config.maxDelay
    );
    return delay;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxRetries) {
          break;
        }

        const backoffDelay = this.calculateBackoff(attempt, config);
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${backoffDelay}ms`, error);
        await this.delay(backoffDelay);
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutConfig: Partial<TimeoutConfig> = {}
  ): Promise<T> {
    const config = { ...this.defaultTimeoutConfig, ...timeoutConfig };
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(config.timeoutErrorMessage));
      }, config.timeout);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  public async executeTool<TInput = any, TOutput = any>(
    tool: Tool<TInput, TOutput>,
    input: TInput,
    retryConfig?: Partial<RetryConfig>,
    timeoutConfig?: Partial<TimeoutConfig>
  ): Promise<TOutput> {
    return this.executeWithTimeout(
      () => this.executeWithRetry(
        () => tool.run(input),
        retryConfig
      ),
      timeoutConfig
    );
  }

  public async executeHttpRequest<T>(
    config: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>,
    timeoutConfig?: Partial<TimeoutConfig>
  ): Promise<T> {
    return this.executeWithTimeout(
      () => this.executeWithRetry(
        async () => {
          try {
            const response = await axios(config);
            return response.data;
          } catch (error) {
            if (error instanceof AxiosError) {
              // Handle specific HTTP errors
              if (error.response?.status === 429) {
                // Rate limit - always retry
                throw new Error('Rate limit exceeded');
              }
              if (error.response?.status >= 500) {
                // Server errors - always retry
                throw new Error('Server error');
              }
              if (error.response?.status === 404) {
                // Not found - don't retry
                throw new Error('Resource not found');
              }
            }
            throw error;
          }
        },
        retryConfig
      ),
      timeoutConfig
    );
  }

  public async executeParallel<T>(
    operations: Array<() => Promise<T>>,
    retryConfig?: Partial<RetryConfig>,
    timeoutConfig?: Partial<TimeoutConfig>
  ): Promise<T[]> {
    const wrappedOperations = operations.map(operation =>
      this.executeWithTimeout(
        () => this.executeWithRetry(operation, retryConfig),
        timeoutConfig
      )
    );

    return Promise.all(wrappedOperations);
  }
} 
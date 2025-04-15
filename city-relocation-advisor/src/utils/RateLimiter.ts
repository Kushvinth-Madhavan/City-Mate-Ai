import { apiConfig } from '../config/api.config';

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;

  constructor() {
    this.maxTokens = apiConfig.rateLimit.burstSize;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = apiConfig.rateLimit.refillRate;
    this.refillInterval = 1000; // 1 second in milliseconds
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / this.refillInterval) * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async acquireToken(): Promise<void> {
    this.refillTokens();

    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) * (this.refillInterval / this.refillRate);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refillTokens();
    }

    this.tokens -= 1;
  }

  public async executeWithRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquireToken();
    return operation();
  }
}

// Create a singleton instance
export const rateLimiter = new RateLimiter(); 
/**
 * Rate limiter utility to handle API quotas and implement retry logic
 */

// Track requests per minute for Gemini API
interface RateLimitInfo {
  requestCount: number;
  lastReset: number;
  isBackingOff: boolean;
  nextAvailable: number;
}

// Model quotas (per minute)
const QUOTA_LIMITS: Record<string, number> = {
  'gemini-1.5-pro': 10,   // Increased from 2 to 10 for testing
  'embedding-001': 20,   // Increased from 10 to 20 for testing
  default: 5             // Increased from 1 to 5 for testing
};

// Keep track of rate limits for different models
const rateLimits: Record<string, RateLimitInfo> = {};

// Initialize rate limit tracking for a model
function initializeModelLimit(model: string): RateLimitInfo {
  return {
    requestCount: 0,
    lastReset: Date.now(),
    isBackingOff: false,
    nextAvailable: Date.now()
  };
}

// Check if we can make a request to a specific model
export function canMakeRequest(model: string): boolean {
  const modelName = model || 'default';
  if (!rateLimits[modelName]) {
    rateLimits[modelName] = initializeModelLimit(modelName);
  }
  
  const limitInfo = rateLimits[modelName];
  const now = Date.now();
  
  // If we're in backoff period, check if it's over
  if (limitInfo.isBackingOff) {
    if (now < limitInfo.nextAvailable) {
      return false;
    } else {
      // Backoff period is over
      limitInfo.isBackingOff = false;
      limitInfo.requestCount = 0;
      limitInfo.lastReset = now;
    }
  }
  
  // Reset counter if a minute has passed
  if (now - limitInfo.lastReset > 60000) {
    limitInfo.requestCount = 0;
    limitInfo.lastReset = now;
  }
  
  // Check if we're under the quota
  const quota = QUOTA_LIMITS[modelName] || QUOTA_LIMITS.default;
  return limitInfo.requestCount < quota;
}

// Register a request to a model
export function registerRequest(model: string): void {
  const modelName = model || 'default';
  if (!rateLimits[modelName]) {
    rateLimits[modelName] = initializeModelLimit(modelName);
  }
  
  rateLimits[modelName].requestCount++;
}

// Handle rate limit error and set backoff period
export function handleRateLimitError(model: string, retryAfterSec: number = 60): void {
  const modelName = model || 'default';
  if (!rateLimits[modelName]) {
    rateLimits[modelName] = initializeModelLimit(modelName);
  }
  
  const limitInfo = rateLimits[modelName];
  limitInfo.isBackingOff = true;
  limitInfo.nextAvailable = Date.now() + (retryAfterSec * 1000);
  
  console.warn(`Rate limit hit for ${modelName}. Backing off for ${retryAfterSec} seconds.`);
}

// Get wait time in milliseconds until next request is available
export function getWaitTime(model: string): number {
  const modelName = model || 'default';
  if (!rateLimits[modelName]) {
    return 0; // No wait if not tracked yet
  }
  
  const limitInfo = rateLimits[modelName];
  const now = Date.now();
  
  if (limitInfo.isBackingOff) {
    return Math.max(0, limitInfo.nextAvailable - now);
  }
  
  // If we're at quota but not in backoff, wait until reset
  const quota = QUOTA_LIMITS[modelName] || QUOTA_LIMITS.default;
  if (limitInfo.requestCount >= quota) {
    // Wait until the minute is up
    return Math.max(0, (limitInfo.lastReset + 60000) - now);
  }
  
  return 0; // No need to wait
}

// Extract retry delay from Gemini error message
export function extractRetryDelay(error: any): number {
  try {
    if (typeof error.message === 'string') {
      const retryMatch = error.message.match(/retryDelay:"(\d+)s"/);
      if (retryMatch && retryMatch[1]) {
        return parseInt(retryMatch[1], 10);
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return 60; // Default to 60 seconds if we can't extract
} 
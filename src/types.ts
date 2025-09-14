// Re-export from the new modular type files for backward compatibility
export * from './types/api.js';
export * from './types/github.js';

// Legacy interfaces for backward compatibility
import {
  PRAnalysis,
  PRFeedback as NewPRFeedback,
} from './types/api.js';

// Keep the old interface names but use the new types
export type PRDetails = PRAnalysis;
export type PRFeedback = NewPRFeedback;

export interface GitHubConfig {
  token: string;
}
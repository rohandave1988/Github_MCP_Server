import { z } from 'zod';
import { ConfigurationError } from '../errors/index.js';

const ConfigSchema = z.object({
  github: z.object({
    token: z.string().min(1, 'GitHub token is required'),
    baseUrl: z.string().url().default('https://api.github.com'),
    timeout: z.number().positive().default(30000),
    retryAttempts: z.number().min(0).max(5).default(3),
  }),
  server: z.object({
    name: z.string().default('github-mcp-server'),
    version: z.string().default('1.0.0'),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
  limits: z.object({
    maxResultsPerSearch: z.number().positive().default(50),
    maxFilesPerPR: z.number().positive().default(100),
    maxCommitsPerPR: z.number().positive().default(50),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): Config {
    try {
      const rawConfig = {
        github: {
          token: process.env.GITHUB_TOKEN,
          baseUrl: process.env.GITHUB_BASE_URL,
          timeout: process.env.GITHUB_TIMEOUT ? parseInt(process.env.GITHUB_TIMEOUT, 10) : undefined,
          retryAttempts: process.env.GITHUB_RETRY_ATTEMPTS 
            ? parseInt(process.env.GITHUB_RETRY_ATTEMPTS, 10) 
            : undefined,
        },
        server: {
          name: process.env.SERVER_NAME,
          version: process.env.SERVER_VERSION,
          logLevel: process.env.LOG_LEVEL,
        },
        limits: {
          maxResultsPerSearch: process.env.MAX_SEARCH_RESULTS 
            ? parseInt(process.env.MAX_SEARCH_RESULTS, 10) 
            : undefined,
          maxFilesPerPR: process.env.MAX_FILES_PER_PR 
            ? parseInt(process.env.MAX_FILES_PER_PR, 10) 
            : undefined,
          maxCommitsPerPR: process.env.MAX_COMMITS_PER_PR 
            ? parseInt(process.env.MAX_COMMITS_PER_PR, 10) 
            : undefined,
        },
      };

      return ConfigSchema.parse(rawConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        throw new ConfigurationError(`Invalid configuration: ${issues}`);
      }
      throw new ConfigurationError('Failed to load configuration');
    }
  }

  public getConfig(): Config {
    return this.config;
  }

  public get github() {
    return this.config.github;
  }

  public get server() {
    return this.config.server;
  }

  public get limits() {
    return this.config.limits;
  }

  public updateConfig(updates: Partial<Config>): void {
    this.config = ConfigSchema.parse({ ...this.config, ...updates });
  }
}

export const config = ConfigManager.getInstance();
export { ConfigManager };
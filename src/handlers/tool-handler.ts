import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  FetchPRDetailsSchema,
  GeneratePRFeedbackSchema,
  FetchPRDetailsInput,
  GeneratePRFeedbackInput,
} from '../types/api.js';
import { GitHubRepository } from '../repositories/github-repository.js';
import { PRAnalysisService } from '../services/pr-analysis-service.js';
import { FeedbackService } from '../services/feedback-service.js';
import { handleError, ValidationError } from '../errors/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export class ToolHandler {
  private githubRepo: GitHubRepository;
  private prAnalysisService: PRAnalysisService;
  private feedbackService: FeedbackService;

  constructor(githubToken: string) {
    this.githubRepo = new GitHubRepository(githubToken);
    this.prAnalysisService = new PRAnalysisService(this.githubRepo);
    this.feedbackService = new FeedbackService();
  }

  setupHandlers(server: Server): void {
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getToolDefinitions(),
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        logger.info('Tool call received', { toolName: name, args });

        const result = await this.handleToolCall(name, args);

        logger.info('Tool call completed successfully', { toolName: name });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const { message, statusCode } = handleError(error);

        logger.error('Tool call failed', {
          toolName: name,
          error: message,
          statusCode,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleToolCall(name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case 'fetch_pr_details':
        return this.handleFetchPRDetails(args);
      case 'generate_pr_feedback':
        return this.handleGeneratePRFeedback(args);
      default:
        throw new ValidationError(`Unknown tool: ${name}`);
    }
  }

  private async handleFetchPRDetails(args: unknown) {
    const validatedArgs = this.validateArgs(FetchPRDetailsSchema, args) as FetchPRDetailsInput;
    
    const prAnalysis = await this.prAnalysisService.analyzePullRequest(
      validatedArgs.repo_url,
      validatedArgs.pr_number
    );

    return prAnalysis;
  }


  private async handleGeneratePRFeedback(args: unknown) {
    const validatedArgs = this.validateArgs(GeneratePRFeedbackSchema, args) as GeneratePRFeedbackInput;
    
    // First analyze the PR
    const prAnalysis = await this.prAnalysisService.analyzePullRequest(
      validatedArgs.repo_url,
      validatedArgs.pr_number
    );

    // Then generate feedback
    const feedback = this.feedbackService.generatePRFeedback(
      prAnalysis,
      validatedArgs.focus_areas
    );

    return {
      pr_analysis: prAnalysis,
      feedback,
    };
  }

  private validateArgs(schema: any, args: unknown): unknown {
    try {
      return schema.parse(args);
    } catch (error) {
      if (error instanceof Error) {
        throw new ValidationError(error.message);
      }
      throw new ValidationError('Invalid arguments provided');
    }
  }

  private getToolDefinitions(): Tool[] {
    return [
      {
        name: 'fetch_pr_details',
        description: 'Fetch and analyze GitHub PR information including files changed, commits, and comprehensive diff analysis',
        inputSchema: {
          type: 'object',
          properties: {
            repo_url: {
              type: 'string',
              format: 'uri',
              description: 'GitHub repository URL (e.g., https://github.com/owner/repo)',
            },
            pr_number: {
              type: 'number',
              description: 'Pull request number',
              minimum: 1,
            },
          },
          required: ['repo_url', 'pr_number'],
          additionalProperties: false,
        },
      } as Tool,
      {
        name: 'generate_pr_feedback',
        description: 'Analyze PR and provide comprehensive feedback on code quality, security, best practices, and focus areas',
        inputSchema: {
          type: 'object',
          properties: {
            repo_url: {
              type: 'string',
              format: 'uri',
              description: 'GitHub repository URL',
            },
            pr_number: {
              type: 'number',
              description: 'Pull request number',
              minimum: 1,
            },
            focus_areas: {
              type: 'array',
              items: { 
                type: 'string',
                enum: [
                  'performance',
                  'security',
                  'accessibility',
                  'maintainability',
                  'testing',
                  'documentation',
                  'architecture',
                  'code_style'
                ]
              },
              description: 'Optional focus areas for targeted feedback',
              maxItems: 5,
            },
          },
          required: ['repo_url', 'pr_number'],
          additionalProperties: false,
        },
      } as Tool,
    ];
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const rateLimitStatus = await this.githubRepo.getRateLimitStatus();
      
      return {
        status: 'healthy',
        details: {
          github_api: 'connected',
          rate_limit: rateLimitStatus,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          github_api: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
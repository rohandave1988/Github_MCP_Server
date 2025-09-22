import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
  ListToolsRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  FetchPRDetailsSchema,
  GeneratePRFeedbackSchema,
  FetchPRDetailsInput,
  GeneratePRFeedbackInput,
  GetPullRequestDiffSchema,
  GetPullRequestFilesSchema,
  GetPullRequestStatusSchema,
  ListPullRequestsSchema,
  GetCommitSchema,
  GetFileContentsSchema,
  ListCommitsSchema,
  SearchCodeSchema,
  SearchRepositoriesSchema,
  GetPullRequestDiffInput,
  GetPullRequestFilesInput,
  GetPullRequestStatusInput,
  ListPullRequestsInput,
  GetCommitInput,
  GetFileContentsInput,
  ListCommitsInput,
  SearchCodeInput,
  SearchRepositoriesInput,
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
    // @ts-ignore - TypeScript has issues with the MCP SDK types
    server.setRequestHandler(ListToolsRequestSchema, async (request: ListToolsRequest) => {
      return {
        tools: this.getToolDefinitions(),
      };
    });

    // @ts-ignore - TypeScript has issues with the MCP SDK types
    server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
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
      case 'get_pull_request_diff':
        return this.handleGetPullRequestDiff(args);
      case 'get_pull_request_files':
        return this.handleGetPullRequestFiles(args);
      case 'get_pull_request_status':
        return this.handleGetPullRequestStatus(args);
      case 'list_pull_requests':
        return this.handleListPullRequests(args);
      case 'get_commit':
        return this.handleGetCommit(args);
      case 'get_file_contents':
        return this.handleGetFileContents(args);
      case 'list_commits':
        return this.handleListCommits(args);
      case 'search_code':
        return this.handleSearchCode(args);
      case 'search_repositories':
        return this.handleSearchRepositories(args);
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

  private async handleGetPullRequestDiff(args: unknown) {
    const validatedArgs = this.validateArgs(GetPullRequestDiffSchema, args) as GetPullRequestDiffInput;

    const diff = await this.githubRepo.getPullRequestDiff(
      validatedArgs.repo_url,
      validatedArgs.pr_number
    );

    return {
      repo_url: validatedArgs.repo_url,
      pr_number: validatedArgs.pr_number,
      diff,
    };
  }

  private async handleGetPullRequestFiles(args: unknown) {
    const validatedArgs = this.validateArgs(GetPullRequestFilesSchema, args) as GetPullRequestFilesInput;

    const files = await this.githubRepo.getPullRequestFiles(
      validatedArgs.repo_url,
      validatedArgs.pr_number
    );

    return {
      repo_url: validatedArgs.repo_url,
      pr_number: validatedArgs.pr_number,
      files,
    };
  }

  private async handleGetPullRequestStatus(args: unknown) {
    const validatedArgs = this.validateArgs(GetPullRequestStatusSchema, args) as GetPullRequestStatusInput;

    const status = await this.githubRepo.getPullRequestStatus(
      validatedArgs.repo_url,
      validatedArgs.pr_number
    );

    return status;
  }

  private async handleListPullRequests(args: unknown) {
    const validatedArgs = this.validateArgs(ListPullRequestsSchema, args) as ListPullRequestsInput;

    const pullRequests = await this.githubRepo.listPullRequests(
      validatedArgs.repo_url,
      validatedArgs.state,
      validatedArgs.limit,
      validatedArgs.page
    );

    return {
      repo_url: validatedArgs.repo_url,
      state: validatedArgs.state,
      page: validatedArgs.page,
      limit: validatedArgs.limit,
      pull_requests: pullRequests,
    };
  }

  private async handleGetCommit(args: unknown) {
    const validatedArgs = this.validateArgs(GetCommitSchema, args) as GetCommitInput;

    const commit = await this.githubRepo.getCommit(
      validatedArgs.repo_url,
      validatedArgs.commit_sha
    );

    return commit;
  }

  private async handleGetFileContents(args: unknown) {
    const validatedArgs = this.validateArgs(GetFileContentsSchema, args) as GetFileContentsInput;

    const content = await this.githubRepo.getFileContent(
      validatedArgs.repo_url,
      validatedArgs.file_path,
      validatedArgs.ref
    );

    return {
      repo_url: validatedArgs.repo_url,
      file_path: validatedArgs.file_path,
      ref: validatedArgs.ref,
      content,
    };
  }

  private async handleListCommits(args: unknown) {
    const validatedArgs = this.validateArgs(ListCommitsSchema, args) as ListCommitsInput;

    const commits = await this.githubRepo.listCommits(
      validatedArgs.repo_url,
      {
        branch: validatedArgs.branch,
        author: validatedArgs.author,
        since: validatedArgs.since,
        until: validatedArgs.until,
        limit: validatedArgs.limit,
        page: validatedArgs.page,
      }
    );

    return {
      repo_url: validatedArgs.repo_url,
      branch: validatedArgs.branch,
      author: validatedArgs.author,
      page: validatedArgs.page,
      limit: validatedArgs.limit,
      commits,
    };
  }

  private async handleSearchCode(args: unknown) {
    const validatedArgs = this.validateArgs(SearchCodeSchema, args) as SearchCodeInput;

    const results = await this.githubRepo.searchCode(
      validatedArgs.repo_url,
      validatedArgs.query,
      validatedArgs.file_extensions
    );

    return {
      repo_url: validatedArgs.repo_url,
      query: validatedArgs.query,
      file_extensions: validatedArgs.file_extensions,
      results,
    };
  }

  private async handleSearchRepositories(args: unknown) {
    const validatedArgs = this.validateArgs(SearchRepositoriesSchema, args) as SearchRepositoriesInput;

    const results = await this.githubRepo.searchRepositories(
      validatedArgs.query,
      {
        sort: validatedArgs.sort,
        order: validatedArgs.order,
        limit: validatedArgs.limit,
        page: validatedArgs.page,
      }
    );

    return results;
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
      {
        name: 'get_pull_request_diff',
        description: 'Get the diff/patch content for a specific pull request',
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
          },
          required: ['repo_url', 'pr_number'],
          additionalProperties: false,
        },
      } as Tool,
      {
        name: 'get_pull_request_files',
        description: 'Get the list of files changed in a pull request',
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
          },
          required: ['repo_url', 'pr_number'],
          additionalProperties: false,
        },
      } as Tool,
      {
        name: 'get_pull_request_status',
        description: 'Get the current status of a pull request including checks, review status, and merge status',
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
          },
          required: ['repo_url', 'pr_number'],
          additionalProperties: false,
        },
      } as Tool,
      {
        name: 'list_pull_requests',
        description: 'List pull requests in a repository with filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            repo_url: {
              type: 'string',
              format: 'uri',
              description: 'GitHub repository URL',
            },
            state: {
              type: 'string',
              enum: ['open', 'closed', 'all'],
              description: 'Filter by pull request state',
              default: 'open',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              minimum: 1,
              maximum: 100,
              default: 30,
            },
            page: {
              type: 'number',
              description: 'Page number for pagination',
              minimum: 1,
              default: 1,
            },
          },
          required: ['repo_url'],
          additionalProperties: false,
        },
      } as Tool,
      {
        name: 'get_commit',
        description: 'Get detailed information about a specific commit',
        inputSchema: {
          type: 'object',
          properties: {
            repo_url: {
              type: 'string',
              format: 'uri',
              description: 'GitHub repository URL',
            },
            commit_sha: {
              type: 'string',
              description: 'The commit SHA to fetch',
            },
          },
          required: ['repo_url', 'commit_sha'],
          additionalProperties: false,
        },
      } as Tool,
      {
        name: 'get_file_contents',
        description: 'Get the contents of a file from a repository',
        inputSchema: {
          type: 'object',
          properties: {
            repo_url: {
              type: 'string',
              format: 'uri',
              description: 'GitHub repository URL',
            },
            file_path: {
              type: 'string',
              description: 'Path to the file in the repository',
            },
            ref: {
              type: 'string',
              description: 'Branch, tag, or commit SHA (defaults to default branch)',
            },
          },
          required: ['repo_url', 'file_path'],
          additionalProperties: false,
        },
      } as Tool,
      {
        name: 'list_commits',
        description: 'List commits in a repository with filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            repo_url: {
              type: 'string',
              format: 'uri',
              description: 'GitHub repository URL',
            },
            branch: {
              type: 'string',
              description: 'Branch name to list commits from',
            },
            author: {
              type: 'string',
              description: 'Filter commits by author',
            },
            since: {
              type: 'string',
              description: 'ISO 8601 date string - only commits after this date',
            },
            until: {
              type: 'string',
              description: 'ISO 8601 date string - only commits before this date',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              minimum: 1,
              maximum: 100,
              default: 30,
            },
            page: {
              type: 'number',
              description: 'Page number for pagination',
              minimum: 1,
              default: 1,
            },
          },
          required: ['repo_url'],
          additionalProperties: false,
        },
      } as Tool,
      {
        name: 'search_code',
        description: 'Search for code within a repository',
        inputSchema: {
          type: 'object',
          properties: {
            repo_url: {
              type: 'string',
              format: 'uri',
              description: 'GitHub repository URL to search within',
            },
            query: {
              type: 'string',
              description: 'Search query string',
            },
            file_extensions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by file extensions (e.g., ["js", "ts"])',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              minimum: 1,
              maximum: 100,
              default: 30,
            },
          },
          required: ['repo_url', 'query'],
          additionalProperties: false,
        },
      } as Tool,
      {
        name: 'search_repositories',
        description: 'Search for repositories on GitHub',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
            sort: {
              type: 'string',
              enum: ['stars', 'forks', 'help-wanted-issues', 'updated'],
              description: 'Sort field for results',
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort order',
              default: 'desc',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              minimum: 1,
              maximum: 100,
              default: 30,
            },
            page: {
              type: 'number',
              description: 'Page number for pagination',
              minimum: 1,
              default: 1,
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      } as Tool,
    ];
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Simple connectivity check by trying to get user info
      await this.githubRepo.getRepository('https://github.com/octocat/Hello-World');

      return {
        status: 'healthy',
        details: {
          github_api: 'connected',
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
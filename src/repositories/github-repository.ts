import { Octokit } from '@octokit/rest';
import {
  GitHubPullRequest,
  GitHubFile,
  GitHubCommit,
  GitHubSearchResult,
  GitHubRepoData,
  RateLimitInfo,
} from '../types/github.js';
import {
  GitHubAPIError,
  PullRequestNotFoundError,
  RepositoryNotFoundError,
  AuthenticationError,
} from '../errors/index.js';
import { parseRepositoryUrl, retry } from '../utils/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class GitHubRepository {
  private octokit: Octokit;
  private maxRetries: number;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
      baseUrl: config.github.baseUrl,
      request: {
        timeout: config.github.timeout,
      },
    });
    this.maxRetries = config.github.retryAttempts;
  }

  private handleApiError(error: any, context: string): never {
    const status = error.status || error.response?.status || 500;
    const message = error.message || 'Unknown GitHub API error';

    logger.error(`GitHub API error in ${context}`, {
      status,
      message,
      context,
    });

    switch (status) {
      case 401:
        throw new AuthenticationError('GitHub token is invalid or expired');
      case 403:
        throw new GitHubAPIError(
          'GitHub API rate limit exceeded or insufficient permissions',
          status,
          error.response?.headers?.['x-ratelimit-remaining'],
          error.response?.headers?.['x-ratelimit-reset']
        );
      case 404:
        throw new RepositoryNotFoundError(context);
      default:
        throw new GitHubAPIError(message, status);
    }
  }

  private extractRateLimitInfo(headers: Record<string, string>): RateLimitInfo {
    return {
      limit: parseInt(headers['x-ratelimit-limit'] || '0', 10),
      remaining: parseInt(headers['x-ratelimit-remaining'] || '0', 10),
      reset: new Date(parseInt(headers['x-ratelimit-reset'] || '0', 10) * 1000),
      used: parseInt(headers['x-ratelimit-used'] || '0', 10),
    };
  }

  async getRepository(repoUrl: string): Promise<GitHubRepoData> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    try {
      const response = await retry(
        () => this.octokit.rest.repos.get({ owner, repo }),
        this.maxRetries
      );

      logger.info('Repository fetched successfully', {
        repository: `${owner}/${repo}`,
        rateLimit: this.extractRateLimitInfo(response.headers as Record<string, string>),
      });

      return response.data as GitHubRepoData;
    } catch (error) {
      this.handleApiError(error, `repository ${owner}/${repo}`);
      throw error; // This line is never reached but satisfies TypeScript
    }
  }

  async getPullRequest(
    repoUrl: string,
    prNumber: number
  ): Promise<GitHubPullRequest> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    try {
      const response = await retry(
        () => this.octokit.rest.pulls.get({ owner, repo, pull_number: prNumber }),
        this.maxRetries
      );

      logger.info('Pull request fetched successfully', {
        repository: `${owner}/${repo}`,
        pr: prNumber,
        rateLimit: this.extractRateLimitInfo(response.headers as Record<string, string>),
      });

      return {
        ...response.data,
        reviewers: [], // GitHub API doesn't provide reviewers in pull request object, need separate API call
      } as GitHubPullRequest;
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        throw new PullRequestNotFoundError(repoUrl, prNumber);
      }
      this.handleApiError(error, `pull request ${owner}/${repo}#${prNumber}`);
      throw error; // This line is never reached but satisfies TypeScript
    }
  }

  async getPullRequestFiles(
    repoUrl: string,
    prNumber: number
  ): Promise<GitHubFile[]> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    try {
      const response = await retry(
        () => this.octokit.rest.pulls.listFiles({ 
          owner, 
          repo, 
          pull_number: prNumber,
          per_page: config.limits.maxFilesPerPR,
        }),
        this.maxRetries
      );

      logger.debug('Pull request files fetched', {
        repository: `${owner}/${repo}`,
        pr: prNumber,
        fileCount: response.data.length,
      });

      return response.data as GitHubFile[];
    } catch (error) {
      this.handleApiError(error, `PR files ${owner}/${repo}#${prNumber}`);
      throw error; // This line is never reached but satisfies TypeScript
    }
  }

  async getPullRequestCommits(
    repoUrl: string,
    prNumber: number
  ): Promise<GitHubCommit[]> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    try {
      const response = await retry(
        () => this.octokit.rest.pulls.listCommits({ 
          owner, 
          repo, 
          pull_number: prNumber,
          per_page: config.limits.maxCommitsPerPR,
        }),
        this.maxRetries
      );

      logger.debug('Pull request commits fetched', {
        repository: `${owner}/${repo}`,
        pr: prNumber,
        commitCount: response.data.length,
      });

      return response.data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name || 'Unknown',
          email: commit.commit.author?.email || '',
          date: commit.commit.author?.date || '',
        },
        url: commit.html_url,
        verification: commit.commit.verification ? {
          verified: commit.commit.verification.verified,
          reason: commit.commit.verification.reason,
        } : undefined,
      }));
    } catch (error) {
      this.handleApiError(error, `PR commits ${owner}/${repo}#${prNumber}`);
      throw error; // This line is never reached but satisfies TypeScript
    }
  }

  async searchCode(
    repoUrl: string,
    query: string,
    fileExtensions?: string[]
  ): Promise<GitHubSearchResult[]> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);
    let searchQuery = `${query} repo:${owner}/${repo}`;

    if (fileExtensions && fileExtensions.length > 0) {
      const extensionFilter = fileExtensions
        .map(ext => `extension:${ext}`)
        .join(' ');
      searchQuery += ` ${extensionFilter}`;
    }

    try {
      const response = await retry(
        () => this.octokit.rest.search.code({
          q: searchQuery,
          per_page: Math.min(100, config.limits.maxResultsPerSearch),
        }),
        this.maxRetries
      );

      logger.info('Code search completed', {
        repository: `${owner}/${repo}`,
        query: searchQuery,
        resultCount: response.data.items.length,
        totalCount: response.data.total_count,
      });

      return response.data.items as GitHubSearchResult[];
    } catch (error) {
      this.handleApiError(error, `code search in ${owner}/${repo}`);
      throw error; // This line is never reached but satisfies TypeScript
    }
  }

  async getFileContent(
    repoUrl: string,
    filePath: string,
    ref?: string
  ): Promise<string> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    try {
      const response = await retry(
        () => this.octokit.rest.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref,
        }),
        this.maxRetries
      );

      const fileData = response.data;
      if ('content' in fileData && fileData.content) {
        return Buffer.from(fileData.content, 'base64').toString('utf8');
      }

      throw new GitHubAPIError('File content not available', 404);
    } catch (error) {
      this.handleApiError(error, `file content ${owner}/${repo}:${filePath}`);
      throw error; // This line is never reached but satisfies TypeScript
    }
  }

  async getRateLimitStatus(): Promise<RateLimitInfo> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      const core = response.data.rate;
      
      return {
        limit: core.limit,
        remaining: core.remaining,
        reset: new Date(core.reset * 1000),
        used: core.used,
      };
    } catch (error) {
      this.handleApiError(error, 'rate limit status');
      throw error; // This line is never reached but satisfies TypeScript
    }
  }
}
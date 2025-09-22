import { Octokit } from '@octokit/rest';
import {
  GitHubPullRequest,
  GitHubFile,
  GitHubCommit,
  GitHubSearchResult,
  GitHubRepoData,
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
          status
        );
      case 404:
        throw new RepositoryNotFoundError(context);
      default:
        throw new GitHubAPIError(message, status);
    }
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

  async getPullRequestDiff(repoUrl: string, prNumber: number): Promise<string> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    try {
      const response = await retry(
        () => this.octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: prNumber,
          mediaType: {
            format: 'diff',
          },
        }),
        this.maxRetries
      );

      logger.info('Pull request diff fetched', {
        repository: `${owner}/${repo}`,
        pr: prNumber,
      });

      return response.data as unknown as string;
    } catch (error) {
      this.handleApiError(error, `PR diff ${owner}/${repo}#${prNumber}`);
      throw error;
    }
  }

  async getPullRequestStatus(repoUrl: string, prNumber: number): Promise<any> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    try {
      const [prResponse, checksResponse] = await Promise.all([
        retry(() => this.octokit.rest.pulls.get({ owner, repo, pull_number: prNumber }), this.maxRetries),
        retry(() => this.octokit.rest.checks.listForRef({
          owner,
          repo,
          ref: `pull/${prNumber}/head`,
          per_page: 100
        }), this.maxRetries).catch(() => ({ data: { check_runs: [] } })),
      ]);

      const pr = prResponse.data;
      const checks = checksResponse.data.check_runs;

      logger.info('Pull request status fetched', {
        repository: `${owner}/${repo}`,
        pr: prNumber,
        checksCount: checks.length,
      });

      return {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        merged: pr.merged,
        mergeable: pr.mergeable,
        mergeable_state: pr.mergeable_state,
        draft: pr.draft,
        author: pr.user?.login,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at,
        closed_at: pr.closed_at,
        checks: checks.map(check => ({
          name: check.name,
          status: check.status,
          conclusion: check.conclusion,
          started_at: check.started_at,
          completed_at: check.completed_at,
        })),
        review_status: {
          approved_count: 0, // Would need additional API calls to get accurate counts
          changes_requested_count: 0,
          comments_count: pr.comments + pr.review_comments,
        },
      };
    } catch (error) {
      this.handleApiError(error, `PR status ${owner}/${repo}#${prNumber}`);
      throw error;
    }
  }

  async listPullRequests(
    repoUrl: string,
    state: 'open' | 'closed' | 'all' = 'open',
    limit: number = 30,
    page: number = 1
  ): Promise<any[]> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    try {
      const response = await retry(
        () => this.octokit.rest.pulls.list({
          owner,
          repo,
          state,
          per_page: Math.min(limit, 100),
          page,
          sort: 'updated',
          direction: 'desc',
        }),
        this.maxRetries
      );

      logger.info('Pull requests listed', {
        repository: `${owner}/${repo}`,
        state,
        count: response.data.length,
        page,
      });

      return response.data.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        draft: pr.draft,
        author: pr.user?.login,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at,
        closed_at: pr.closed_at,
        html_url: pr.html_url,
        labels: pr.labels.map(label => label.name),
        assignees: pr.assignees?.map(assignee => assignee.login) || [],
      }));
    } catch (error) {
      this.handleApiError(error, `list PRs ${owner}/${repo}`);
      throw error;
    }
  }

  async getCommit(repoUrl: string, commitSha: string): Promise<any> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);

    try {
      const response = await retry(
        () => this.octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: commitSha,
        }),
        this.maxRetries
      );

      const commit = response.data;

      logger.info('Commit fetched', {
        repository: `${owner}/${repo}`,
        sha: commitSha,
      });

      return {
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name,
          email: commit.commit.author?.email,
          date: commit.commit.author?.date,
          login: commit.author?.login,
        },
        committer: {
          name: commit.commit.committer?.name,
          email: commit.commit.committer?.email,
          date: commit.commit.committer?.date,
          login: commit.committer?.login,
        },
        url: commit.html_url,
        stats: commit.stats,
        files: commit.files?.map(file => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
        })),
        verification: commit.commit.verification,
        parents: commit.parents.map(parent => ({
          sha: parent.sha,
          url: parent.url,
        })),
      };
    } catch (error) {
      this.handleApiError(error, `commit ${owner}/${repo}:${commitSha}`);
      throw error;
    }
  }

  async listCommits(
    repoUrl: string,
    options: {
      branch?: string;
      author?: string;
      since?: string;
      until?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<any[]> {
    const { owner, repo } = parseRepositoryUrl(repoUrl);
    const { branch, author, since, until, limit = 30, page = 1 } = options;

    try {
      const response = await retry(
        () => this.octokit.rest.repos.listCommits({
          owner,
          repo,
          sha: branch,
          author,
          since,
          until,
          per_page: Math.min(limit, 100),
          page,
        }),
        this.maxRetries
      );

      logger.info('Commits listed', {
        repository: `${owner}/${repo}`,
        branch,
        author,
        count: response.data.length,
        page,
      });

      return response.data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name,
          email: commit.commit.author?.email,
          date: commit.commit.author?.date,
          login: commit.author?.login,
        },
        committer: {
          name: commit.commit.committer?.name,
          email: commit.commit.committer?.email,
          date: commit.commit.committer?.date,
          login: commit.committer?.login,
        },
        url: commit.html_url,
        verification: commit.commit.verification,
        parents: commit.parents.map(parent => ({
          sha: parent.sha,
          url: parent.url,
        })),
      }));
    } catch (error) {
      this.handleApiError(error, `list commits ${owner}/${repo}`);
      throw error;
    }
  }

  async searchRepositories(
    query: string,
    options: {
      sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
      order?: 'asc' | 'desc';
      limit?: number;
      page?: number;
    } = {}
  ): Promise<any> {
    const { sort, order = 'desc', limit = 30, page = 1 } = options;

    try {
      const response = await retry(
        () => this.octokit.rest.search.repos({
          q: query,
          sort,
          order,
          per_page: Math.min(limit, 100),
          page,
        }),
        this.maxRetries
      );

      logger.info('Repository search completed', {
        query,
        resultCount: response.data.items.length,
        totalCount: response.data.total_count,
        page,
      });

      return {
        total_count: response.data.total_count,
        incomplete_results: response.data.incomplete_results,
        items: response.data.items.map(repo => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          html_url: repo.html_url,
          clone_url: repo.clone_url,
          language: repo.language,
          stargazers_count: repo.stargazers_count,
          watchers_count: repo.watchers_count,
          forks_count: repo.forks_count,
          open_issues_count: repo.open_issues_count,
          topics: repo.topics,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          pushed_at: repo.pushed_at,
          owner: {
            login: repo.owner?.login,
            type: repo.owner?.type,
            avatar_url: repo.owner?.avatar_url,
          },
          license: repo.license ? {
            name: repo.license.name,
            spdx_id: repo.license.spdx_id,
          } : null,
        })),
      };
    } catch (error) {
      this.handleApiError(error, `repository search: ${query}`);
      throw error;
    }
  }

}
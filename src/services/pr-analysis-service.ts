import { GitHubRepository } from '../repositories/github-repository.js';
import {
  PRAnalysis,
  PRFileChange,
  PRCommitInfo,
  DiffSummary,
  PRMetadata,
  FocusArea,
} from '../types/api.js';
import { GitHubPullRequest, GitHubFile, GitHubCommit } from '../types/github.js';
import { logger } from '../utils/logger.js';
import { sanitizeString } from '../utils/index.js';

export class PRAnalysisService {
  constructor(private githubRepo: GitHubRepository) {}

  async analyzePullRequest(repoUrl: string, prNumber: number): Promise<PRAnalysis> {
    logger.info('Starting PR analysis', { repository: repoUrl, pr: prNumber });

    const startTime = Date.now();

    try {
      const [pullRequest, files, commits] = await Promise.all([
        this.githubRepo.getPullRequest(repoUrl, prNumber),
        this.githubRepo.getPullRequestFiles(repoUrl, prNumber),
        this.githubRepo.getPullRequestCommits(repoUrl, prNumber),
      ]);

      const analysis: PRAnalysis = {
        title: sanitizeString(pullRequest.title),
        description: sanitizeString(pullRequest.body || '', 5000),
        author: pullRequest.user.login,
        state: pullRequest.state,
        draft: pullRequest.draft,
        files_changed: this.analyzeFiles(files),
        commits: this.analyzeCommits(commits),
        diff_summary: this.generateDiffSummary(files),
        metadata: this.extractMetadata(pullRequest),
      };

      const analysisTime = Date.now() - startTime;
      logger.info('PR analysis completed', {
        repository: repoUrl,
        pr: prNumber,
        analysisTimeMs: analysisTime,
        filesChanged: analysis.files_changed.length,
        commitsCount: analysis.commits.length,
      });

      return analysis;
    } catch (error) {
      logger.error('PR analysis failed', {
        repository: repoUrl,
        pr: prNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private analyzeFiles(files: GitHubFile[]): PRFileChange[] {
    return files.map(file => {
      const totalChanges = file.additions + file.deletions;
      
      return {
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: totalChanges,
        patch: file.patch,
        language: this.detectLanguage(file.filename),
        size_category: this.categorizeFileSize(totalChanges),
      };
    });
  }

  private analyzeCommits(commits: GitHubCommit[]): PRCommitInfo[] {
    return commits.map(commit => ({
      sha: commit.sha,
      message: sanitizeString(commit.message, 1000),
      author: commit.author.name,
      date: commit.author.date,
      url: commit.url,
      is_merge_commit: this.isMergeCommit(commit.message),
      verified: commit.verification?.verified || false,
    }));
  }

  private generateDiffSummary(files: GitHubFile[]): DiffSummary {
    const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
    const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);
    const totalChanges = totalAdditions + totalDeletions;
    
    const languagesAffected = [
      ...new Set(
        files
          .map(file => this.detectLanguage(file.filename))
          .filter(lang => lang !== 'unknown')
      ),
    ];

    return {
      total_additions: totalAdditions,
      total_deletions: totalDeletions,
      total_changes: totalChanges,
      files_count: files.length,
      languages_affected: languagesAffected,
      change_complexity: this.assessChangeComplexity(totalChanges, files.length),
    };
  }

  private extractMetadata(pr: GitHubPullRequest): PRMetadata {
    return {
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      merged_at: pr.merged_at || undefined,
      closed_at: pr.closed_at || undefined,
      labels: pr.labels.map(label => label.name),
      assignees: pr.assignees.map(assignee => assignee.login),
      reviewers: pr.reviewers?.map(reviewer => reviewer.login) || [],
      milestone: pr.milestone?.title,
      linked_issues: this.extractLinkedIssues(pr.body || ''),
    };
  }

  private detectLanguage(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      py: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      cs: 'C#',
      php: 'PHP',
      rb: 'Ruby',
      go: 'Go',
      rs: 'Rust',
      kt: 'Kotlin',
      swift: 'Swift',
      dart: 'Dart',
      scala: 'Scala',
      clj: 'Clojure',
      hs: 'Haskell',
      elm: 'Elm',
      vue: 'Vue',
      svelte: 'Svelte',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      sass: 'Sass',
      less: 'Less',
      json: 'JSON',
      yaml: 'YAML',
      yml: 'YAML',
      xml: 'XML',
      md: 'Markdown',
      sql: 'SQL',
      sh: 'Shell',
      bash: 'Bash',
      ps1: 'PowerShell',
      dockerfile: 'Docker',
    };

    return languageMap[extension || ''] || 'unknown';
  }

  private categorizeFileSize(changes: number): 'small' | 'medium' | 'large' | 'xl' {
    if (changes <= 10) return 'small';
    if (changes <= 50) return 'medium';
    if (changes <= 200) return 'large';
    return 'xl';
  }

  private assessChangeComplexity(
    totalChanges: number,
    fileCount: number
  ): 'low' | 'medium' | 'high' | 'very_high' {
    const changesPerFile = totalChanges / fileCount;
    
    if (totalChanges <= 50 && fileCount <= 5) return 'low';
    if (totalChanges <= 200 && fileCount <= 15 && changesPerFile <= 50) return 'medium';
    if (totalChanges <= 500 && fileCount <= 25) return 'high';
    return 'very_high';
  }

  private isMergeCommit(message: string): boolean {
    return message.toLowerCase().startsWith('merge ') ||
           message.includes('Merge pull request') ||
           message.includes('Merge branch');
  }

  private extractLinkedIssues(body: string): number[] {
    const issuePatterns = [
      /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi,
      /#(\d+)/g,
    ];

    const issues: number[] = [];
    
    for (const pattern of issuePatterns) {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        const issueNumber = parseInt(match[1], 10);
        if (!issues.includes(issueNumber)) {
          issues.push(issueNumber);
        }
      }
    }

    return issues.sort((a, b) => a - b);
  }

  async getDetailedFileChanges(
    repoUrl: string,
    prNumber: number,
    focusAreas?: FocusArea[]
  ): Promise<PRFileChange[]> {
    const files = await this.githubRepo.getPullRequestFiles(repoUrl, prNumber);
    const detailedFiles = this.analyzeFiles(files);

    if (focusAreas?.includes('security')) {
      return this.flagSecuritySensitiveFiles(detailedFiles);
    }

    return detailedFiles;
  }

  private flagSecuritySensitiveFiles(files: PRFileChange[]): PRFileChange[] {
    const securityPatterns = [
      /auth/i,
      /password/i,
      /token/i,
      /secret/i,
      /credential/i,
      /security/i,
      /permission/i,
      /privilege/i,
      /crypto/i,
      /encrypt/i,
      /\.env/i,
      /config/i,
    ];

    return files.map(file => {
      const isSecuritySensitive = securityPatterns.some(pattern =>
        pattern.test(file.filename)
      );

      return {
        ...file,
        // Add security flag as a custom property
        ...({ isSecuritySensitive } as any),
      };
    });
  }
}
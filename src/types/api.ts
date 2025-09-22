import { z } from 'zod';

export const FetchPRDetailsSchema = z.object({
  repo_url: z.string().url('Invalid repository URL'),
  pr_number: z.number().int().positive('PR number must be a positive integer'),
});


export const GeneratePRFeedbackSchema = z.object({
  repo_url: z.string().url('Invalid repository URL'),
  pr_number: z.number().int().positive('PR number must be a positive integer'),
  focus_areas: z
    .array(
      z.enum([
        'performance',
        'security',
        'accessibility',
        'maintainability',
        'testing',
        'documentation',
        'architecture',
        'code_style',
      ])
    )
    .optional(),
});

// New schemas for additional functionality
export const GetPullRequestDiffSchema = z.object({
  repo_url: z.string().url('Invalid repository URL'),
  pr_number: z.number().int().positive('PR number must be a positive integer'),
});

export const GetPullRequestFilesSchema = z.object({
  repo_url: z.string().url('Invalid repository URL'),
  pr_number: z.number().int().positive('PR number must be a positive integer'),
});

export const GetPullRequestStatusSchema = z.object({
  repo_url: z.string().url('Invalid repository URL'),
  pr_number: z.number().int().positive('PR number must be a positive integer'),
});

export const ListPullRequestsSchema = z.object({
  repo_url: z.string().url('Invalid repository URL'),
  state: z.enum(['open', 'closed', 'all']).default('open'),
  limit: z.number().int().positive().max(100).default(30),
  page: z.number().int().positive().default(1),
});

export const GetCommitSchema = z.object({
  repo_url: z.string().url('Invalid repository URL'),
  commit_sha: z.string().min(1, 'Commit SHA is required'),
});

export const GetFileContentsSchema = z.object({
  repo_url: z.string().url('Invalid repository URL'),
  file_path: z.string().min(1, 'File path is required'),
  ref: z.string().optional(),
});

export const ListCommitsSchema = z.object({
  repo_url: z.string().url('Invalid repository URL'),
  branch: z.string().optional(),
  author: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  limit: z.number().int().positive().max(100).default(30),
  page: z.number().int().positive().default(1),
});

export const SearchCodeSchema = z.object({
  repo_url: z.string().url('Invalid repository URL'),
  query: z.string().min(1, 'Search query is required'),
  file_extensions: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(100).default(30),
});

export const SearchRepositoriesSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  sort: z.enum(['stars', 'forks', 'help-wanted-issues', 'updated']).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().positive().max(100).default(30),
  page: z.number().int().positive().default(1),
});

// Type definitions for the new schemas
export type FetchPRDetailsInput = z.infer<typeof FetchPRDetailsSchema>;
export type GeneratePRFeedbackInput = z.infer<typeof GeneratePRFeedbackSchema>;
export type GetPullRequestDiffInput = z.infer<typeof GetPullRequestDiffSchema>;
export type GetPullRequestFilesInput = z.infer<typeof GetPullRequestFilesSchema>;
export type GetPullRequestStatusInput = z.infer<typeof GetPullRequestStatusSchema>;
export type ListPullRequestsInput = z.infer<typeof ListPullRequestsSchema>;
export type GetCommitInput = z.infer<typeof GetCommitSchema>;
export type GetFileContentsInput = z.infer<typeof GetFileContentsSchema>;
export type ListCommitsInput = z.infer<typeof ListCommitsSchema>;
export type SearchCodeInput = z.infer<typeof SearchCodeSchema>;
export type SearchRepositoriesInput = z.infer<typeof SearchRepositoriesSchema>;

export interface PRAnalysis {
  title: string;
  description: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  files_changed: PRFileChange[];
  commits: PRCommitInfo[];
  diff_summary: DiffSummary;
  metadata: PRMetadata;
  reviews?: PRReview[];
}

export interface PRFileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  language?: string;
  size_category: 'small' | 'medium' | 'large' | 'xl';
}

export interface PRCommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
  is_merge_commit: boolean;
  verified: boolean;
}

export interface DiffSummary {
  total_additions: number;
  total_deletions: number;
  total_changes: number;
  files_count: number;
  languages_affected: string[];
  change_complexity: 'low' | 'medium' | 'high' | 'very_high';
}

export interface PRMetadata {
  created_at: string;
  updated_at: string;
  merged_at?: string;
  closed_at?: string;
  labels: string[];
  assignees: string[];
  reviewers: string[];
  milestone?: string;
  linked_issues: number[];
}

export interface PRReview {
  user: string;
  state: 'approved' | 'changes_requested' | 'commented';
  submitted_at: string;
  body: string;
  comments_count: number;
}


export type FocusArea = 
  | 'performance'
  | 'security'
  | 'accessibility'
  | 'maintainability'
  | 'testing'
  | 'documentation'
  | 'architecture'
  | 'code_style';

export interface QualityAssessment {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  comments: string[];
  strengths: string[];
  concerns: string[];
}

export interface SecurityAssessment {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  considerations: string[];
  vulnerabilities_found: SecurityVulnerability[];
  recommendations: string[];
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file: string;
  line_number?: number;
  recommendation: string;
}

export interface PRFeedback {
  overall_assessment: string;
  summary_score: number;
  code_quality: QualityAssessment;
  security_assessment: SecurityAssessment;
  suggestions: string[];
  best_practices: {
    followed: string[];
    needs_improvement: string[];
  };
  focus_area_analysis?: Record<FocusArea, string[]>;
  estimated_review_time: number;
  complexity_analysis: {
    cognitive_complexity: 'low' | 'medium' | 'high';
    change_risk: 'low' | 'medium' | 'high';
    testing_requirements: string[];
  };
}
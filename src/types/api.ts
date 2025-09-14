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

export type FetchPRDetailsInput = z.infer<typeof FetchPRDetailsSchema>;
export type GeneratePRFeedbackInput = z.infer<typeof GeneratePRFeedbackSchema>;

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
export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  type: 'User' | 'Bot';
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
  verification?: {
    verified: boolean;
    reason: string;
  };
}

export interface GitHubFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  patch?: string;
  contents_url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  user: GitHubUser;
  assignees: GitHubUser[];
  reviewers: GitHubUser[];
  labels: Array<{
    name: string;
    color: string;
    description: string;
  }>;
  milestone?: {
    title: string;
    description: string;
    state: 'open' | 'closed';
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  html_url: string;
  diff_url: string;
  patch_url: string;
  base: {
    ref: string;
    sha: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  mergeable: boolean | null;
  mergeable_state: string;
  merged_by: GitHubUser | null;
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface GitHubRepoData {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  languages_url: string;
  default_branch: string;
  owner: GitHubUser;
  topics: string[];
  visibility: 'public' | 'private' | 'internal';
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  license?: {
    name: string;
    spdx_id: string;
  };
}

export interface GitHubSearchResult {
  name: string;
  path: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
  };
  score: number;
  text_matches?: Array<{
    object_url: string;
    object_type: string;
    property: string;
    fragment: string;
    matches: Array<{
      text: string;
      indices: [number, number];
    }>;
  }>;
}


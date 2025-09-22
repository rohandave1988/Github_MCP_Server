# GitHub MCP Server

A comprehensive Model Context Protocol (MCP) server that provides extensive GitHub repository analysis and management capabilities. Perfect for integration with Amazon Q Developer and other AI assistants.

## Features

- **Pull Request Operations**: Comprehensive PR analysis, diffs, file listings, and status tracking
- **Commit Management**: Detailed commit information and history tracking
- **Repository Search**: Advanced code and repository search capabilities
- **File Operations**: Access and retrieve file contents from repositories
- **Enterprise Ready**: Built for production use with robust error handling and rate limiting
- **Amazon Q Integration**: Native support for Amazon Q Developer workflows

## Prerequisites

- Node.js 18+
- GitHub Personal Access Token

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set environment variables**:
   ```bash
   export GITHUB_TOKEN="your_github_token_here"
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Run the server**:
   ```bash
   npm start
   ```

## Quick Reference - All Available Actions

| **Action** | **Purpose** | **Key Parameters** |
|-----------|-------------|-------------------|
| `fetch_pr_details` | Complete PR analysis with feedback | `repo_url`, `pr_number` |
| `generate_pr_feedback` | AI-powered code review feedback | `repo_url`, `pr_number`, `focus_areas` |
| `get_pull_request_diff` | Get raw diff/patch content | `repo_url`, `pr_number` |
| `get_pull_request_files` | List changed files with stats | `repo_url`, `pr_number` |
| `get_pull_request_status` | PR status, checks, reviews | `repo_url`, `pr_number` |
| `list_pull_requests` | List PRs with filtering | `repo_url`, `state`, `limit`, `page` |
| `get_commit` | Detailed commit information | `repo_url`, `commit_sha` |
| `list_commits` | Repository commit history | `repo_url`, `branch`, `author`, `since`, `until` |
| `get_file_contents` | Retrieve file contents | `repo_url`, `file_path`, `ref` |
| `search_code` | Search code within repository | `repo_url`, `query`, `file_extensions` |
| `search_repositories` | Search GitHub repositories | `query`, `sort`, `order`, `limit` |

## Available Tools

This server provides **11 comprehensive MCP tools** for GitHub repository operations:

### Pull Request Operations

#### `fetch_pr_details`
Retrieves detailed information and analysis about a GitHub pull request.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `pr_number` (number): Pull request number

**Returns**: PR details including title, description, files changed, commits, and comprehensive diff analysis.

#### `generate_pr_feedback`
Analyzes a PR and provides intelligent feedback on code quality, security, and best practices.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `pr_number` (number): Pull request number
- `focus_areas` (array, optional): Specific areas to focus on (e.g., ["performance", "security", "testing"])

**Returns**: Comprehensive feedback including quality scores, security assessments, and improvement suggestions.

#### `get_pull_request_diff`
Gets the raw diff/patch content for a specific pull request.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `pr_number` (number): Pull request number

**Returns**: Raw diff content showing all changes in unified diff format.

#### `get_pull_request_files`
Gets the list of files changed in a pull request with detailed change statistics.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `pr_number` (number): Pull request number

**Returns**: Array of files with additions, deletions, and change details.

#### `get_pull_request_status`
Gets the current status of a pull request including CI checks, reviews, and merge status.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `pr_number` (number): Pull request number

**Returns**: PR status including merge state, checks, review status, and metadata.

#### `list_pull_requests`
Lists pull requests in a repository with filtering and pagination options.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `state` (string, optional): Filter by state ("open", "closed", "all") - default: "open"
- `limit` (number, optional): Maximum results (1-100) - default: 30
- `page` (number, optional): Page number for pagination - default: 1

**Returns**: Array of pull requests with basic information and metadata.

### Commit Operations

#### `get_commit`
Gets detailed information about a specific commit including files changed and statistics.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `commit_sha` (string): The commit SHA to fetch

**Returns**: Detailed commit information with files, stats, verification, and parent information.

#### `list_commits`
Lists commits in a repository with advanced filtering options.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `branch` (string, optional): Branch name to list commits from
- `author` (string, optional): Filter commits by author
- `since` (string, optional): ISO 8601 date - only commits after this date
- `until` (string, optional): ISO 8601 date - only commits before this date
- `limit` (number, optional): Maximum results (1-100) - default: 30
- `page` (number, optional): Page number for pagination - default: 1

**Returns**: Array of commits with author, message, and verification information.

### File Operations

#### `get_file_contents`
Gets the contents of a specific file from a repository.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `file_path` (string): Path to the file in the repository
- `ref` (string, optional): Branch, tag, or commit SHA (defaults to default branch)

**Returns**: File contents as text with metadata.

### Search Operations

#### `search_code`
Searches for code within a specific repository with advanced filtering.

**Parameters**:
- `repo_url` (string): GitHub repository URL to search within
- `query` (string): Search query string
- `file_extensions` (array, optional): Filter by file extensions (e.g., ["js", "ts"])
- `limit` (number, optional): Maximum results (1-100) - default: 30

**Returns**: Search results with file matches, context, and relevance scores.

#### `search_repositories`
Searches for repositories on GitHub with sorting and filtering options.

**Parameters**:
- `query` (string): Search query string
- `sort` (string, optional): Sort by "stars", "forks", "help-wanted-issues", or "updated"
- `order` (string, optional): Sort order "asc" or "desc" - default: "desc"
- `limit` (number, optional): Maximum results (1-100) - default: 30
- `page` (number, optional): Page number for pagination - default: 1

**Returns**: Repository search results with metadata, stats, and owner information.

## Integration Options

### Amazon Q Developer Integration

This MCP server is optimized for Amazon Q Developer. Follow these steps:

#### Command Line Interface (CLI)
1. **Configure MCP Server**:
   ```bash
   # Create MCP configuration directory
   mkdir -p ~/.mcp

   # Add server configuration
   cat > ~/.mcp/config.json << EOF
   {
     "servers": {
       "github-mcp": {
         "command": "node",
         "args": ["/path/to/github-mcp-server/build/index.js"],
         "env": {
           "GITHUB_TOKEN": "your_github_token_here"
         }
       }
     }
   }
   EOF
   ```

2. **Use with Amazon Q CLI**:
   ```bash
   # Pull Request Operations
   q "analyze the security issues in PR #123 for owner/repo"
   q "show me the diff for pull request #456 in owner/repository"
   q "list all open pull requests in owner/repo"
   q "what's the status of PR #789 in owner/repository?"
   q "show me which files changed in PR #123 for owner/repo"

   # Commit Operations
   q "get the commit details for SHA abc123def in owner/repo"
   q "show me commits by john.doe since 2024-01-01 in owner/repository"
   q "list the last 10 commits on main branch in owner/repo"

   # File Operations
   q "show me the contents of package.json in owner/repository"
   q "get the README file from the dev branch in owner/repo"

   # Search Operations
   q "search for authentication code in owner/repository"
   q "find all TypeScript files with 'async' in owner/repo"
   q "search for popular React repositories on GitHub"
   ```

#### IntelliJ IDEA Plugin
1. Open **Settings** → **Tools** → **Amazon Q Developer** → **MCP Servers**
2. Click **Add Server**
3. Configure:
   - **Name**: `github-mcp`
   - **Command**: `node`
   - **Arguments**: `/full/path/to/github-mcp-server/build/index.js`
   - **Environment Variables**:
     - `GITHUB_TOKEN`: `your_github_token_here`
4. Enable the server and restart IntelliJ

### Claude Desktop Integration

Add this server to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["/path/to/github-mcp-server/build/index.js"],
      "env": {
        "GITHUB_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Usage Examples

### Pull Request Operations

#### Complete PR Analysis
```bash
# Comprehensive analysis with AI feedback
"Analyze pull request #456 in facebook/react including security and performance review"

# Focus on specific areas
"Generate feedback for PR #123 in owner/repo focusing on security and testing"
```

#### PR Diff and Files
```bash
# Get raw diff content
"Show me the diff for pull request #123 in owner/repo"

# List all changed files with statistics
"What files were changed in PR #456 in microsoft/typescript?"

# Get detailed file changes
"Show me which files have the most changes in PR #789 for owner/repository"
```

#### PR Status and Management
```bash
# Check PR status and CI results
"What's the status of PR #789 in microsoft/typescript including all checks?"

# List PRs with filtering
"Show me all open pull requests in facebook/react"
"List closed PRs from the last 30 days in owner/repository"
"Find all draft pull requests in owner/repo"
```

### Commit Operations

#### Individual Commits
```bash
# Get detailed commit information
"Show me detailed information about commit abc123def in owner/repository"

# Analyze commit changes
"What files were changed in commit sha456 in microsoft/vscode?"

# Check commit verification
"Is commit abc123 verified in owner/repo?"
```

#### Commit History
```bash
# List recent commits
"Show me the last 10 commits from john.doe in owner/repository since 2024-01-01"

# Filter by branch and author
"List all commits on main branch by alice.smith in owner/repo"

# Date range filtering
"Show commits between 2024-01-01 and 2024-02-01 in owner/repository"

# Paginated results
"Show me page 2 of commits in owner/repo with 20 results per page"
```

### File Operations

#### File Content Retrieval
```bash
# Get current file contents
"Show me the contents of package.json from main branch in owner/repo"

# Specific branch or commit
"Get the README file from the dev branch in owner/repo"
"Show me src/index.ts from commit abc123 in owner/repository"

# Configuration files
"Display the contents of .github/workflows/ci.yml in owner/repo"
```

### Search Operations

#### Code Search Within Repository
```bash
# Basic code search
"Find all authentication-related code in owner/repository"

# Search with file type filtering
"Find all TypeScript files with 'async' in owner/repo"
"Search for 'database' in all JavaScript files in owner/repository"

# Advanced search patterns
"Find all functions named 'validate' in Python files in owner/repo"
"Search for TODO comments in owner/repository"
```

#### Repository Discovery
```bash
# Popular repositories
"Find the most popular TypeScript repositories related to 'machine learning'"

# Specific technology search
"Search for React repositories with more than 1000 stars"
"Find recently updated Node.js projects on GitHub"

# Sorted results
"Show me the most forked JavaScript repositories"
"Find help-wanted issues in popular Python repositories"
```

### Advanced Workflows

#### PR Review Workflow
```bash
# Complete PR review process
1. "List all open pull requests in owner/repository"
2. "Get the status of PR #123 in owner/repo"
3. "Show me the files changed in PR #123"
4. "Analyze PR #123 for security and performance issues"
5. "Generate comprehensive feedback for PR #123"
```

#### Code Investigation Workflow
```bash
# Investigate code changes
1. "Search for 'authentication' code in owner/repository"
2. "Show me the commit that last modified src/auth.js in owner/repo"
3. "Get the detailed changes in commit abc123 for owner/repository"
4. "List all commits that touched authentication files since 2024-01-01"
```

#### Repository Research Workflow
```bash
# Research new technologies
1. "Search for popular Rust repositories related to 'web frameworks'"
2. "Show me the README of the top result"
3. "List recent commits in actix/actix-web repository"
4. "Search for 'middleware' code in actix/actix-web"
```

## Complete API Reference

### Action Categories & Use Cases

| **Category** | **Actions** | **Primary Use Cases** |
|--------------|-------------|---------------------|
| **PR Analysis** | `fetch_pr_details`, `generate_pr_feedback` | Code review, quality assessment, automated feedback |
| **PR Management** | `get_pull_request_diff`, `get_pull_request_files`, `get_pull_request_status`, `list_pull_requests` | PR tracking, diff analysis, CI/CD integration |
| **Commit Tracking** | `get_commit`, `list_commits` | Code history, change tracking, author analysis |
| **File Access** | `get_file_contents` | Configuration review, code inspection, documentation |
| **Code Discovery** | `search_code`, `search_repositories` | Code exploration, research, pattern finding |

### Response Data Summary

| **Action** | **Key Response Data** |
|-----------|----------------------|
| `fetch_pr_details` | Title, description, files, commits, diff analysis, metadata |
| `generate_pr_feedback` | Quality scores, security assessment, suggestions, best practices |
| `get_pull_request_diff` | Raw unified diff content |
| `get_pull_request_files` | File list with additions, deletions, changes, status |
| `get_pull_request_status` | Merge status, checks, reviews, CI/CD results |
| `list_pull_requests` | PR summaries with state, author, dates, labels |
| `get_commit` | Author, message, files changed, stats, verification |
| `list_commits` | Commit history with authors, messages, dates |
| `get_file_contents` | File content as text with metadata |
| `search_code` | Code matches with context and relevance scores |
| `search_repositories` | Repository metadata, stats, owner info, topics |

### Common Parameter Patterns

| **Parameter** | **Used In** | **Description** | **Example** |
|---------------|-------------|-----------------|-------------|
| `repo_url` | Most actions | GitHub repository URL | `https://github.com/owner/repo` |
| `pr_number` | PR actions | Pull request number | `123` |
| `commit_sha` | Commit actions | Git commit SHA | `abc123def456` |
| `query` | Search actions | Search query string | `"authentication"` |
| `limit` | List actions | Max results (1-100) | `30` |
| `page` | List actions | Page number for pagination | `1` |
| `state` | PR listing | Filter by state | `"open"`, `"closed"`, `"all"` |
| `branch` | Commit/file actions | Git branch name | `"main"`, `"develop"` |
| `ref` | File actions | Git reference (branch/tag/SHA) | `"main"`, `"v1.0.0"` |
| `file_extensions` | Code search | File type filter | `["js", "ts"]` |
| `focus_areas` | PR feedback | Analysis focus areas | `["security", "performance"]` |

## Advanced Configuration

### Environment Variables

Configure the server behavior with these environment variables:

- `GITHUB_TOKEN` (required): GitHub Personal Access Token
- `GITHUB_BASE_URL` (optional): GitHub API base URL (default: https://api.github.com)
- `GITHUB_TIMEOUT` (optional): API request timeout in milliseconds (default: 30000)
- `GITHUB_RETRY_ATTEMPTS` (optional): Number of retry attempts (default: 3)
- `LOG_LEVEL` (optional): Logging level (error, warn, info, debug) (default: info)
- `MAX_SEARCH_RESULTS` (optional): Maximum search results per request (default: 50)
- `MAX_FILES_PER_PR` (optional): Maximum files to analyze per PR (default: 100)
- `MAX_COMMITS_PER_PR` (optional): Maximum commits to analyze per PR (default: 50)

### Token Permissions

Your GitHub token should have the following scopes:
- `repo` (for private repositories) or `public_repo` (for public repositories only)
- `read:user` (for user information)

### Rate Limiting

The server implements intelligent rate limiting and retry mechanisms:
- Automatic retry on rate limit hits
- Exponential backoff for failed requests
- Respects GitHub's rate limit headers
- Efficient request batching where possible

## Security

- **Token Security**: Keep your GitHub token secure and never commit it to version control
- **Minimal Permissions**: The server only requires read access to repositories
- **Official API**: All operations use the official GitHub REST API
- **No Data Storage**: The server does not store or cache any repository data
- **Enterprise Ready**: Supports GitHub Enterprise Server with custom base URLs

## Development

```bash
# Development mode with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting (fix ESLint config first)
npm run lint:fix

# Run tests
npm test

# Build for production
npm run build

# Health check
npm run health
```

### Project Structure

```
src/
├── handlers/           # MCP tool handlers
├── repositories/       # GitHub API integration
├── services/          # Business logic services
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── errors/           # Custom error classes
└── config/           # Configuration management
```

## Troubleshooting

### Common Issues

1. **"GitHub token is invalid or expired"**
   - Verify your token is correct and hasn't expired
   - Check that the token has the required scopes
   - For enterprise GitHub, ensure the base URL is correct

2. **"Rate limit exceeded"**
   - The server automatically handles rate limits with retries
   - Consider reducing the frequency of requests
   - Check if your token has sufficient rate limit quota

3. **"Repository not found"**
   - Verify the repository URL format: `https://github.com/owner/repo`
   - Ensure your token has access to the repository
   - Check if the repository exists and is accessible

4. **"MCP server not connecting"**
   - Verify the server path in your MCP configuration
   - Check that Node.js 18+ is installed
   - Ensure the server builds successfully with `npm run build`

### Performance Tips

- Use pagination for large result sets
- Filter searches with file extensions when possible
- Batch multiple related operations when feasible
- Monitor rate limit usage with debug logging

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
LOG_LEVEL=debug npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Changelog

### v2.0.0
- ✨ Added 9 new GitHub operations
- 🚀 Amazon Q Developer integration
- 📊 Enhanced PR analysis capabilities
- 🔍 Advanced search functionality
- 🛠️ Improved error handling and retry logic
- 📚 Comprehensive documentation

### v1.0.0
- 🎉 Initial release with basic PR analysis

## License

MIT
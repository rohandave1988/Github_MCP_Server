# GitHub MCP Server

A Model Context Protocol (MCP) server that provides GitHub PR analysis capabilities.

## Features

- **PR Details Fetching**: Get comprehensive information about GitHub pull requests
- **PR Feedback Generation**: Automated code quality assessment and suggestions

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

## Available Tools

This server provides 2 MCP tools for GitHub repository analysis:

### `fetch_pr_details`
Retrieves detailed information about a GitHub pull request.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `pr_number` (number): Pull request number

**Returns**: PR details including title, description, files changed, commits, and diff summary.

### `generate_pr_feedback`
Analyzes a PR and provides constructive feedback.

**Parameters**:
- `repo_url` (string): GitHub repository URL
- `pr_number` (number): Pull request number
- `focus_areas` (array, optional): Specific areas to focus on (e.g., ["performance", "security"])

**Returns**: Comprehensive feedback including code quality score, security considerations, and suggestions.

## Configuration with Claude Desktop

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


## Security

- Keep your GitHub token secure and never commit it to version control
- The server runs with minimal permissions and only accesses public repository data
- All API calls are made through official GitHub REST API

## Development

```bash
# Development mode with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test
```

## License

MIT
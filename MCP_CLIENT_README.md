# MCP Client for GitHub PR Analyzer

This is a minimal MCP (Model Context Protocol) client to test and interact with the GitHub PR analysis server.

## Usage

### Basic Test Suite
```bash
GITHUB_TOKEN="your_token_here" node mcp-client.js
```

This will:
1. Start the GitHub MCP server
2. Initialize MCP connection
3. List available tools
4. Test both tools (fetch_pr_details and generate_pr_feedback)
5. Display results and shutdown

### Sample Output
```
🚀 GitHub MCP Client Test Suite
================================

🔌 Starting GitHub MCP Server...
📋 Server info: Starting GitHub MCP Server application
📋 Server info: GitHub MCP Server is running
🤝 Initializing MCP connection...
✅ MCP connection initialized
🔍 Listing available tools...
📋 Available tools:
1. fetch_pr_details - Analyze GitHub pull requests
2. generate_pr_feedback - Generate comprehensive PR feedback

🧪 Testing fetch_pr_details tool...
✅ Tool call successful
📊 PR Title: Apply font-variation-settings to the suggestion widget
👤 Author: chengluyu
📁 Files changed: 1

🧪 Testing generate_pr_feedback tool...
✅ Tool call successful  
📈 Quality Score: 10/10
🎯 Grade: A

🎉 All tests completed!
```

## Features

- **MCP Protocol Implementation**: Full MCP 2025-06-18 protocol support
- **Real-time Server Logs**: Shows server status and operations
- **Tool Testing**: Automatically tests both available tools
- **Error Handling**: Proper error handling and timeout management
- **Graceful Shutdown**: Clean shutdown on SIGINT/SIGTERM

## Technical Details

- Uses Node.js `child_process.spawn()` to start the MCP server
- Implements JSON-RPC 2.0 over stdio transport
- Handles server logs via stderr
- Processes MCP protocol messages via stdout
- Supports request/response and notification patterns

## Customization

You can modify the test cases in the `testFetchPRDetails()` and `testGeneratePRFeedback()` methods to test different repositories and PR numbers.
#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';

class MCPClient {
  constructor() {
    this.serverProcess = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
  }

  async connect() {
    console.log('🔌 Starting GitHub MCP Server...');
    
    // Start the MCP server process
    this.serverProcess = spawn('node', ['build/index.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || 'your_token_here'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle server stderr (logs)
    this.serverProcess.stderr.on('data', (data) => {
      const logMessages = data.toString().trim().split('\n');
      logMessages.forEach(logMessage => {
        if (logMessage.trim()) {
          try {
            const parsed = JSON.parse(logMessage);
            if (parsed.level === 'ERROR') {
              console.log('🚨 Server error:', parsed.message);
            } else if (parsed.level === 'INFO') {
              console.log('📋 Server info:', parsed.message);
            }
          } catch (error) {
            // Not JSON, just log as is
            console.log('📋 Server log:', logMessage);
          }
        }
      });
    });

    // Handle server stdout (MCP protocol messages)
    const readline = createInterface({
      input: this.serverProcess.stdout,
      output: process.stdout,
      terminal: false
    });

    readline.on('line', (line) => {
      if (line.trim()) {
        this.handleServerMessage(line.trim());
      }
    });

    // Handle server exit
    this.serverProcess.on('exit', (code) => {
      console.log(`❌ Server process exited with code ${code}`);
    });

    // Wait a moment for server to start
    await this.sleep(3000);

    // Initialize the MCP connection
    await this.initialize();
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  handleServerMessage(message) {
    try {
      const parsed = JSON.parse(message);
      
      if (parsed.id !== undefined && this.pendingRequests.has(parsed.id)) {
        // This is a response to our request
        const { resolve, reject } = this.pendingRequests.get(parsed.id);
        this.pendingRequests.delete(parsed.id);
        
        if (parsed.error) {
          reject(new Error(JSON.stringify(parsed.error)));
        } else {
          resolve(parsed.result);
        }
      }
    } catch (error) {
      // Might be a raw log message, ignore
    }
  }

  async sendRequest(method, params = {}) {
    const id = ++this.messageId;
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      const messageStr = JSON.stringify(message) + '\n';
      this.serverProcess.stdin.write(messageStr);
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for ${method}`));
        }
      }, 15000);
    });
  }

  async initialize() {
    console.log('🤝 Initializing MCP connection...');
    
    try {
      const result = await this.sendRequest('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: {
          name: 'test-mcp-client',
          version: '1.0.0'
        }
      });
      
      console.log('✅ MCP connection initialized');
      
      // Send initialized notification
      await this.sendNotification('notifications/initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize MCP connection:', error.message);
      throw error;
    }
  }

  async sendNotification(method, params = {}) {
    const message = {
      jsonrpc: '2.0',
      method,
      params
    };
    
    const messageStr = JSON.stringify(message) + '\n';
    this.serverProcess.stdin.write(messageStr);
  }

  async listTools() {
    console.log('🔍 Listing available tools...');
    
    try {
      const result = await this.sendRequest('tools/list');
      console.log('📋 Available tools:');
      
      result.tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`);
        console.log(`   Description: ${tool.description}`);
        console.log('');
      });
      
      return result.tools;
    } catch (error) {
      console.error('❌ Failed to list tools:', error.message);
      return [];
    }
  }

  async callTool(name, args) {
    console.log(`🛠️  Calling tool: ${name}`);
    
    try {
      const result = await this.sendRequest('tools/call', {
        name,
        arguments: args
      });
      
      console.log('✅ Tool call successful');
      return result;
    } catch (error) {
      console.error(`❌ Tool call failed: ${error.message}`);
      throw error;
    }
  }

  async testFetchPRDetails() {
    console.log('\n🧪 Testing fetch_pr_details tool...');
    
    try {
      const result = await this.callTool('fetch_pr_details', {
        repo_url: 'https://github.com/microsoft/vscode',
        pr_number: 200000
      });
      
      const data = JSON.parse(result.content[0].text);
      console.log(`📊 PR Title: ${data.title}`);
      console.log(`👤 Author: ${data.author}`);
      console.log(`📁 Files changed: ${data.diff_summary.files_count}`);
      
    } catch (error) {
      console.error('❌ fetch_pr_details test failed:', error.message);
    }
  }

  async testGeneratePRFeedback() {
    console.log('\n🧪 Testing generate_pr_feedback tool...');
    
    try {
      const result = await this.callTool('generate_pr_feedback', {
        repo_url: 'https://github.com/microsoft/vscode',
        pr_number: 200000,
        focus_areas: ['security']
      });
      
      const data = JSON.parse(result.content[0].text);
      console.log(`📈 Quality Score: ${data.feedback.summary_score}/10`);
      console.log(`🎯 Grade: ${data.feedback.code_quality.grade}`);
      
    } catch (error) {
      console.error('❌ generate_pr_feedback test failed:', error.message);
    }
  }

  async disconnect() {
    console.log('🔌 Disconnecting from server...');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      await this.sleep(1000);
      
      if (!this.serverProcess.killed) {
        this.serverProcess.kill('SIGKILL');
      }
    }
    
    console.log('👋 Disconnected');
  }

  async runTests() {
    try {
      await this.connect();
      await this.listTools();
      await this.testFetchPRDetails();
      await this.testGeneratePRFeedback();
      
      console.log('\n🎉 All tests completed!');
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the client if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new MCPClient();
  
  console.log('🚀 GitHub MCP Client Test Suite');
  console.log('================================\n');
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⚡ Received SIGINT, shutting down...');
    await client.disconnect();
    process.exit(0);
  });
  
  // Run tests
  client.runTests().then(() => {
    console.log('\n✨ Test suite completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  });
}

export { MCPClient };
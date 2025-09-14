#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ToolHandler } from './handlers/tool-handler.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { ConfigurationError, AuthenticationError } from './errors/index.js';

/**
 * Enhanced GitHub MCP Server
 * 
 * A Model Context Protocol server that provides comprehensive GitHub repository
 * analysis capabilities including:
 * - Pull request analysis and feedback generation
 * - Advanced code search with context
 * - Security and quality assessments
 * - Best practices evaluation
 */
class GitHubMCPServer {
  private server!: Server;
  private toolHandler!: ToolHandler;
  private isConnected: boolean = false;

  constructor() {
    logger.info('Initializing GitHub MCP Server', {
      version: config.server.version,
      logLevel: config.server.logLevel,
    });

    this.validateEnvironment();
    this.initializeServer();
    this.setupGracefulShutdown();
  }

  private validateEnvironment(): void {
    try {
      // Configuration validation happens in config module
      // Additional runtime validation can be added here
      logger.info('Environment validation passed', {
        hasGitHubToken: !!config.github.token,
        baseUrl: config.github.baseUrl,
        retryAttempts: config.github.retryAttempts,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Environment validation failed';
      logger.error('Environment validation failed', { error: message });
      throw new ConfigurationError(message);
    }
  }

  private initializeServer(): void {
    try {
      // Initialize MCP Server
      this.server = new Server(
        {
          name: config.server.name,
          version: config.server.version,
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Initialize tool handler
      this.toolHandler = new ToolHandler(config.github.token);

      // Setup request handlers
      this.toolHandler.setupHandlers(this.server);

      logger.info('Server initialized successfully', {
        serverName: config.server.name,
        capabilities: ['tools'],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server initialization failed';
      logger.error('Server initialization failed', { error: message });
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const handleShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      // Perform cleanup tasks
      this.isConnected = false;
      
      // Log final statistics or cleanup operations here
      logger.info('Server shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', { reason, promise });
      process.exit(1);
    });
  }

  async run(): Promise<void> {
    try {
      // Perform health check before starting
      const healthStatus = await this.toolHandler.healthCheck();
      if (healthStatus.status !== 'healthy') {
        throw new AuthenticationError('GitHub API health check failed');
      }

      logger.info('Health check passed', healthStatus.details);

      // Connect to transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.isConnected = true;
      
      logger.info('GitHub MCP Server is running', {
        transport: 'stdio',
        pid: process.pid,
        nodeVersion: process.version,
      });

      // Keep the process alive
      await new Promise(() => {}); // This will run indefinitely
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start server';
      logger.error('Server startup failed', { error: message });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.isConnected) {
      logger.info('Stopping server...');
      this.isConnected = false;
      // Additional cleanup logic can be added here
    }
  }

  getStatus(): { isConnected: boolean; uptime: number } {
    return {
      isConnected: this.isConnected,
      uptime: process.uptime(),
    };
  }
}

/**
 * Application entry point
 * Handles server lifecycle and error management
 */
async function main(): Promise<void> {
  let server: GitHubMCPServer | null = null;
  
  try {
    logger.info('Starting GitHub MCP Server application');
    
    server = new GitHubMCPServer();
    await server.run();
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Application startup failed';
    
    logger.error('Application failed to start', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Provide user-friendly error messages for common issues
    if (error instanceof ConfigurationError) {
      console.error('\n❌ Configuration Error:');
      console.error(`   ${message}`);
      console.error('\n💡 Please check your environment variables and configuration.');
    } else if (error instanceof AuthenticationError) {
      console.error('\n❌ Authentication Error:');
      console.error(`   ${message}`);
      console.error('\n💡 Please check your GitHub token is valid and has required permissions.');
    } else {
      console.error('\n❌ Unexpected Error:');
      console.error(`   ${message}`);
      console.error('\n💡 Please check the logs for more details.');
    }
    
    process.exit(1);
    
  } finally {
    if (server) {
      await server.stop();
    }
  }
}

// Only run main if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error in main', { error: error.message });
    console.error('Fatal error occurred. Exiting...');
    process.exit(1);
  });
}

export { GitHubMCPServer };
export default GitHubMCPServer;
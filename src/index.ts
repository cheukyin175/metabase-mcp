#!/usr/bin/env node

/**
 * Metabase MCP Server
 * Implements interaction with Metabase API, providing the following functions:
 * - Get dashboard list
 * - Get questions list
 * - Get database list
 * - Execute question queries
 * - Get dashboard details
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Custom error enum
enum ErrorCode {
  InternalError = "internal_error",
  InvalidRequest = "invalid_request",
  InvalidParams = "invalid_params",
  MethodNotFound = "method_not_found"
}

// Custom error class
class McpError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "McpError";
  }
}

// API error type definition
interface ApiError {
  status?: number;
  message?: string;
  data?: { message?: string };
}

// Get Metabase configuration from environment variables
const METABASE_URL = process.env.METABASE_URL;
const METABASE_USER_EMAIL = process.env.METABASE_USER_EMAIL;
const METABASE_PASSWORD = process.env.METABASE_PASSWORD;
const METABASE_API_KEY = process.env.METABASE_API_KEY;

if (!METABASE_URL || (!METABASE_API_KEY && (!METABASE_USER_EMAIL || !METABASE_PASSWORD))) {
  throw new Error("METABASE_URL is required, and either METABASE_API_KEY or both METABASE_USER_EMAIL and METABASE_PASSWORD must be provided");
}

// Create custom Schema object using z.object
const ListResourceTemplatesRequestSchema = z.object({
  method: z.literal("resources/list_templates")
});

const ListToolsRequestSchema = z.object({
  method: z.literal("tools/list")
});

// Logger level enum
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// Authentication method enum
enum AuthMethod {
  SESSION = 'session',
  API_KEY = 'api_key'
}

class MetabaseServer {
  private server: Server;
  private baseUrl: string;
  private sessionToken: string | null = null;
  private apiKey: string | null = null;
  private authMethod: AuthMethod = METABASE_API_KEY ? AuthMethod.API_KEY : AuthMethod.SESSION;
  private headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  constructor() {
    this.server = new Server(
      {
        name: "metabase-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.baseUrl = METABASE_URL!;
    if (METABASE_API_KEY) {
      this.apiKey = METABASE_API_KEY;
      this.logInfo('Using API Key authentication method');
    } else {
      this.logInfo('Using Session Token authentication method');
    }

    this.setupResourceHandlers();
    this.setupToolHandlers();

    // Enhanced error handling with logging
    this.server.onerror = (error: Error) => {
      this.logError('Unexpected server error occurred', error);
    };

    process.on('SIGINT', async () => {
      this.logInfo('Gracefully shutting down server');
      await this.server.close();
      process.exit(0);
    });
  }

  // Enhanced logging utilities
  private log(level: LogLevel, message: string, data?: unknown, error?: Error) {
    const timestamp = new Date().toISOString();

    const logMessage: Record<string, unknown> = {
      timestamp,
      level,
      message
    };

    if (data !== undefined) {
      logMessage.data = data;
    }

    if (error) {
      logMessage.error = error.message || 'Unknown error';
      logMessage.stack = error.stack;
    }

    // Output structured log for machine processing
    console.error(JSON.stringify(logMessage));

    // Output human-readable format
    try {
      let logPrefix = level.toUpperCase();

      if (error) {
        console.error(`[${timestamp}] ${logPrefix}: ${message} - ${error.message || 'Unknown error'}`);
      } else {
        console.error(`[${timestamp}] ${logPrefix}: ${message}`);
      }
    } catch (e) {
      // Ignore if console is not available
    }
  }

  private logDebug(message: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, data);
  }

  private logInfo(message: string, data?: unknown) {
    this.log(LogLevel.INFO, message, data);
  }

  private logWarn(message: string, data?: unknown, error?: Error) {
    this.log(LogLevel.WARN, message, data, error);
  }

  private logError(message: string, error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log(LogLevel.ERROR, message, undefined, errorObj);
  }

  private logFatal(message: string, error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log(LogLevel.FATAL, message, undefined, errorObj);
  }

  /**
   * HTTP request utility method
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const headers = { ...this.headers };

    // Add appropriate authentication headers based on the method
    if (this.authMethod === AuthMethod.API_KEY && this.apiKey) {
      // Use X-API-KEY header as specified in the Metabase documentation
      headers['X-API-KEY'] = this.apiKey;
    } else if (this.authMethod === AuthMethod.SESSION && this.sessionToken) {
      headers['X-Metabase-Session'] = this.sessionToken;
    }

    this.logDebug(`Making request to ${url.toString()}`);
    this.logDebug(`Using headers: ${JSON.stringify(headers)}`);

    const response = await fetch(url.toString(), {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = `API request failed with status ${response.status}: ${response.statusText}`;
      this.logWarn(errorMessage, errorData);

      throw {
        status: response.status,
        message: response.statusText,
        data: errorData
      };
    }

    this.logDebug(`Received successful response from ${path}`);
    return response.json() as Promise<T>;
  }

  /**
   * Get Metabase session token (only needed for session auth method)
   */
  private async getSessionToken(): Promise<string> {
    // If using API Key authentication, return the API key directly
    if (this.authMethod === AuthMethod.API_KEY && this.apiKey) {
      this.logInfo('Using API Key authentication', {
        keyLength: this.apiKey.length,
        keyFormat: this.apiKey.includes('mb_') ? 'starts with mb_' : 'other format'
      });
      return this.apiKey;
    }

    // For session auth, continue with existing logic
    if (this.sessionToken) {
      return this.sessionToken;
    }

    this.logInfo('Initiating authentication with Metabase');
    try {
      const response = await this.request<{ id: string }>('/api/session', {
        method: 'POST',
        body: JSON.stringify({
          username: METABASE_USER_EMAIL,
          password: METABASE_PASSWORD,
        }),
      });

      this.sessionToken = response.id;
      this.logInfo('Successfully authenticated with Metabase');
      return this.sessionToken;
    } catch (error) {
      this.logError('Authentication with Metabase failed', error);
      throw new McpError(
        ErrorCode.InternalError,
        'Failed to authenticate with Metabase'
      );
    }
  }

  /**
   * Set up resource handlers
   */
  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async (_request) => {
      this.logInfo('Processing request to list resources', { requestId: this.generateRequestId() });
      await this.getSessionToken();

      try {
        // Get dashboard list
        this.logDebug('Fetching dashboards from Metabase');
        const dashboardsResponse = await this.request<any[]>('/api/dashboard');

        const resourceCount = dashboardsResponse.length;
        this.logInfo(`Successfully retrieved ${resourceCount} dashboards from Metabase`);

        // Return dashboards as resources
        return {
          resources: dashboardsResponse.map((dashboard: any) => ({
            uri: `metabase://dashboard/${dashboard.id}`,
            mimeType: "application/json",
            name: dashboard.name,
            description: `Metabase dashboard: ${dashboard.name}`
          }))
        };
      } catch (error) {
        this.logError('Failed to retrieve dashboards from Metabase', error);
        throw new McpError(
          ErrorCode.InternalError,
          'Failed to retrieve Metabase resources'
        );
      }
    });

    // Resource templates
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      this.logInfo('Processing request to list resource templates');
      return {
        resourceTemplates: [
          {
            uriTemplate: 'metabase://dashboard/{id}',
            name: 'Dashboard by ID',
            mimeType: 'application/json',
            description: 'Get a Metabase dashboard by its ID',
          },
          {
            uriTemplate: 'metabase://card/{id}',
            name: 'Card by ID',
            mimeType: 'application/json',
            description: 'Get a Metabase question/card by its ID',
          },
          {
            uriTemplate: 'metabase://database/{id}',
            name: 'Database by ID',
            mimeType: 'application/json',
            description: 'Get a Metabase database by its ID',
          },
        ],
      };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const requestId = this.generateRequestId();
      this.logInfo('Processing request to read resource', {
        requestId,
        uri: request.params?.uri
      });

      await this.getSessionToken();

      const uri = request.params?.uri;
      if (!uri) {
        this.logWarn('Missing URI parameter in resource request', { requestId });
        throw new McpError(
          ErrorCode.InvalidParams,
          "URI parameter is required"
        );
      }

      let match;

      try {
        // Handle dashboard resource
        if ((match = uri.match(/^metabase:\/\/dashboard\/(\d+)$/))) {
          const dashboardId = match[1];
          this.logDebug(`Fetching dashboard with ID: ${dashboardId}`);

          const response = await this.request<any>(`/api/dashboard/${dashboardId}`);
          this.logInfo(`Successfully retrieved dashboard: ${response.name || dashboardId}`);

          return {
            contents: [{
              uri: request.params?.uri,
              mimeType: "application/json",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }

        // Handle question/card resource
        else if ((match = uri.match(/^metabase:\/\/card\/(\d+)$/))) {
          const cardId = match[1];
          this.logDebug(`Fetching card/question with ID: ${cardId}`);

          const response = await this.request<any>(`/api/card/${cardId}`);
          this.logInfo(`Successfully retrieved card: ${response.name || cardId}`);

          return {
            contents: [{
              uri: request.params?.uri,
              mimeType: "application/json",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }

        // Handle database resource
        else if ((match = uri.match(/^metabase:\/\/database\/(\d+)$/))) {
          const databaseId = match[1];
          this.logDebug(`Fetching database with ID: ${databaseId}`);

          const response = await this.request<any>(`/api/database/${databaseId}`);
          this.logInfo(`Successfully retrieved database: ${response.name || databaseId}`);

          return {
            contents: [{
              uri: request.params?.uri,
              mimeType: "application/json",
              text: JSON.stringify(response, null, 2)
            }]
          };
        }

        else {
          this.logWarn(`Invalid URI format: ${uri}`, { requestId });
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Invalid URI format: ${uri}`
          );
        }
      } catch (error) {
        const apiError = error as ApiError;
        const errorMessage = apiError.data?.message || apiError.message || 'Unknown error';
        this.logError(`Failed to fetch Metabase resource: ${errorMessage}`, error);

        throw new McpError(
          ErrorCode.InternalError,
          `Metabase API error: ${errorMessage}`
        );
      }
    });
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Set up tool handlers
   */
  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logInfo('Processing request to list available tools');
      return {
        tools: [
          {
            name: "list_dashboards",
            description: "List all dashboards in Metabase",
            inputSchema: {
              type: "object",
              properties: {}
            }
          },
          {
            name: "list_cards",
            description: "List all questions/cards in Metabase",
            inputSchema: {
              type: "object",
              properties: {}
            }
          },
          {
            name: "list_databases",
            description: "List all databases in Metabase",
            inputSchema: {
              type: "object",
              properties: {}
            }
          },
          {
            name: "execute_card",
            description: "Execute a Metabase question/card and get results",
            inputSchema: {
              type: "object",
              properties: {
                card_id: {
                  type: "number",
                  description: "ID of the card/question to execute"
                },
                parameters: {
                  type: "object",
                  description: "Optional parameters for the query"
                }
              },
              required: ["card_id"]
            }
          },
          {
            name: "get_dashboard_cards",
            description: "Get all cards in a dashboard",
            inputSchema: {
              type: "object",
              properties: {
                dashboard_id: {
                  type: "number",
                  description: "ID of the dashboard"
                }
              },
              required: ["dashboard_id"]
            }
          },
          {
            name: "execute_query",
            description: "Execute a SQL query against a Metabase database",
            inputSchema: {
              type: "object",
              properties: {
                database_id: {
                  type: "number",
                  description: "ID of the database to query"
                },
                query: {
                  type: "string",
                  description: "SQL query to execute"
                },
                native_parameters: {
                  type: "array",
                  description: "Optional parameters for the query",
                  items: {
                    type: "object"
                  }
                }
              },
              required: ["database_id", "query"]
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params?.name || 'unknown';
      const requestId = this.generateRequestId();

      this.logInfo(`Processing tool execution request: ${toolName}`, {
        requestId,
        toolName,
        arguments: request.params?.arguments
      });

      await this.getSessionToken();

      try {
        switch (request.params?.name) {
          case "list_dashboards": {
            this.logDebug('Fetching all dashboards from Metabase');
            const response = await this.request<any[]>('/api/dashboard');
            this.logInfo(`Successfully retrieved ${response.length} dashboards`);

            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }]
            };
          }

          case "list_cards": {
            this.logDebug('Fetching all cards/questions from Metabase');
            const response = await this.request<any[]>('/api/card');
            this.logInfo(`Successfully retrieved ${response.length} cards/questions`);

            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }]
            };
          }

          case "list_databases": {
            this.logDebug('Fetching all databases from Metabase');
            const response = await this.request<any[]>('/api/database');
            this.logInfo(`Successfully retrieved ${response.length} databases`);

            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }]
            };
          }

          case "execute_card": {
            const cardId = request.params?.arguments?.card_id;
            if (!cardId) {
              this.logWarn('Missing card_id parameter in execute_card request', { requestId });
              throw new McpError(
                ErrorCode.InvalidParams,
                "Card ID parameter is required"
              );
            }

            this.logDebug(`Executing card with ID: ${cardId}`);
            const parameters = request.params?.arguments?.parameters || {};

            const response = await this.request<any>(`/api/card/${cardId}/query`, {
              method: 'POST',
              body: JSON.stringify({ parameters })
            });

            this.logInfo(`Successfully executed card: ${cardId}`);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }]
            };
          }

          case "get_dashboard_cards": {
            const dashboardId = request.params?.arguments?.dashboard_id;
            if (!dashboardId) {
              this.logWarn('Missing dashboard_id parameter in get_dashboard_cards request', { requestId });
              throw new McpError(
                ErrorCode.InvalidParams,
                "Dashboard ID parameter is required"
              );
            }

            this.logDebug(`Fetching cards for dashboard with ID: ${dashboardId}`);
            const response = await this.request<any>(`/api/dashboard/${dashboardId}`);

            const cardCount = response.cards?.length || 0;
            this.logInfo(`Successfully retrieved ${cardCount} cards from dashboard: ${dashboardId}`);

            return {
              content: [{
                type: "text",
                text: JSON.stringify(response.cards, null, 2)
              }]
            };
          }

          case "execute_query": {
            const databaseId = request.params?.arguments?.database_id;
            const query = request.params?.arguments?.query;
            const nativeParameters = request.params?.arguments?.native_parameters || [];

            if (!databaseId) {
              this.logWarn('Missing database_id parameter in execute_query request', { requestId });
              throw new McpError(
                ErrorCode.InvalidParams,
                "Database ID parameter is required"
              );
            }

            if (!query) {
              this.logWarn('Missing query parameter in execute_query request', { requestId });
              throw new McpError(
                ErrorCode.InvalidParams,
                "SQL query parameter is required"
              );
            }

            this.logDebug(`Executing SQL query against database ID: ${databaseId}`);

            // Build query request body
            const queryData = {
              type: "native",
              native: {
                query: query,
                template_tags: {}
              },
              parameters: nativeParameters,
              database: databaseId
            };

            const response = await this.request<any>('/api/dataset', {
              method: 'POST',
              body: JSON.stringify(queryData)
            });

            this.logInfo(`Successfully executed SQL query against database: ${databaseId}`);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(response, null, 2)
              }]
            };
          }

          default:
            this.logWarn(`Received request for unknown tool: ${request.params?.name}`, { requestId });
            return {
              content: [
                {
                  type: "text",
                  text: `Unknown tool: ${request.params?.name}`
                }
              ],
              isError: true
            };
        }
      } catch (error) {
        const apiError = error as ApiError;
        const errorMessage = apiError.data?.message || apiError.message || 'Unknown error';

        this.logError(`Tool execution failed: ${errorMessage}`, error);
        return {
          content: [{
            type: "text",
            text: `Metabase API error: ${errorMessage}`
          }],
          isError: true
        };
      }
    });
  }

  async run() {
    try {
      this.logInfo('Starting Metabase MCP server');
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logInfo('Metabase MCP server successfully connected and running on stdio transport');
    } catch (error) {
      this.logFatal('Failed to start Metabase MCP server', error);
      throw error;
    }
  }
}

// Add global error handlers
process.on('uncaughtException', (error: Error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'fatal',
    message: 'Uncaught exception detected',
    error: error.message,
    stack: error.stack
  }));
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'fatal',
    message: 'Unhandled promise rejection detected',
    error: errorMessage
  }));
});

const server = new MetabaseServer();
server.run().catch(error => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'fatal',
    message: 'Fatal error during server startup',
    error: error instanceof Error ? error.message : String(error)
  }));
  process.exit(1);
});
